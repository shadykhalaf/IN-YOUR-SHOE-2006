/**
 * IYS GAMES rewards: REAL merchant discounts only (server-side).
 *
 *   GAME_REWARDS     JSON list, merchant-approved mapping game → existing Shopify code
 *                    [{ id, game, minScore, requiresWin?, code, label, description, conditions?, minPlaySeconds?, merchantConfirmedUntil? }]
 *   REWARDS_SECRET   ≥ 32 chars, signs play tickets (HMAC-SHA256)
 *   + the Admin API token from ./shopify.ts (read_discounts), to confirm each code is ACTIVE
 *
 *   GET  ?op=list               rewards that are really redeemable right now (never the codes)
 *   GET  ?op=ticket&game=snake  a signed play ticket when that game has a live reward
 *   POST ?op=claim              { rewardId, ticket, score, won } → the code, if earned
 *
 * Honest limits: games run in the browser, so a determined player can fake a
 * score. These are generic campaign codes whose limits (dates, usage, once per
 * customer, combinations) are enforced by Shopify itself; the ticket + minimum
 * play time + rate limit only stop casual farming. No endpoint mints codes.
 * Unique single-use codes would need the Admin API write scope and real
 * authentication; see docs/SHOPIFY_GO_LIVE_CHECKLIST.md.
 */
import { clientKey, createRateLimiter, json, readJson, sameOrigin } from './http.js';
import { codeStatus, shopifyConfig, type Fetcher, type ShopifyEnv } from './shopify.js';

export const GAMES = ['snake', 'stacks', 'chomp', 'tower', 'invaders', 'purbale-closet', 'purbale-pairs', 'purbale-pack'] as const;
export type Game = (typeof GAMES)[number];

export interface RewardConfig {
  id: string;
  game: Game;
  minScore: number;
  requiresWin: boolean;
  code: string;
  label: string;
  description: string;
  conditions: string | null;
  minPlaySeconds: number;
  /** Merchant confirmed in writing that the code is live until this date (used only when the Admin API can't be asked). */
  merchantConfirmedUntil: string | null;
}

export interface RewardsEnv extends ShopifyEnv {
  GAME_REWARDS?: string;
  REWARDS_SECRET?: string;
}

const s = (v: unknown, max: number) => (typeof v === 'string' && v.trim() && v.trim().length <= max ? v.trim() : null);

/** Parse + validate the merchant mapping. Invalid entries are dropped (and reported), never guessed. */
export function parseRewards(raw: string | undefined): { rewards: RewardConfig[]; problems: string[] } {
  if (!raw?.trim()) return { rewards: [], problems: ['GAME_REWARDS is not set'] };
  let list: unknown;
  try {
    list = JSON.parse(raw);
  } catch {
    return { rewards: [], problems: ['GAME_REWARDS is not valid JSON'] };
  }
  if (!Array.isArray(list)) return { rewards: [], problems: ['GAME_REWARDS must be a JSON array'] };
  const rewards: RewardConfig[] = [];
  const problems: string[] = [];
  list.forEach((r, i) => {
    const o = (r ?? {}) as Record<string, unknown>;
    const id = s(o.id, 40);
    const game = GAMES.find((g) => g === o.game);
    const code = s(o.code, 64);
    const label = s(o.label, 60);
    const description = s(o.description, 200);
    const minScore = Number(o.minScore);
    const until = s(o.merchantConfirmedUntil, 10);
    if (!id || !/^[a-z0-9-]+$/.test(id) || !game || !code || !/^[A-Z0-9_-]+$/i.test(code) || !label || !description || !Number.isSafeInteger(minScore) || minScore < 0 || (until && !/^\d{4}-\d{2}-\d{2}$/.test(until))) {
      problems.push(`GAME_REWARDS[${i}] is invalid and was ignored`);
      return;
    }
    rewards.push({
      id,
      game,
      minScore,
      requiresWin: o.requiresWin === true,
      code: code.toUpperCase(),
      label,
      description,
      conditions: s(o.conditions, 200),
      minPlaySeconds: Math.min(1800, Math.max(10, Number.isFinite(Number(o.minPlaySeconds)) ? Number(o.minPlaySeconds) : 30)),
      merchantConfirmedUntil: until,
    });
  });
  return { rewards, problems };
}

/* ── Play tickets: HMAC-SHA256 over game.issuedAt.nonce ─────────────── */

const enc = new TextEncoder();
const b64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function hmac(secret: string, msg: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64(await crypto.subtle.sign('HMAC', key, enc.encode(msg)));
}
export async function signTicket(secret: string, game: Game, issuedAt: number, nonce: string) {
  const body = `${game}.${issuedAt}.${nonce}`;
  return `${body}.${await hmac(secret, body)}`;
}
export async function verifyTicket(secret: string, ticket: unknown): Promise<{ game: Game; issuedAt: number; nonce: string } | null> {
  if (typeof ticket !== 'string' || ticket.length > 300) return null;
  const parts = ticket.split('.');
  if (parts.length !== 4) return null;
  const [game, at, nonce, sig] = parts as [string, string, string, string];
  const g = GAMES.find((x) => x === game);
  const issuedAt = Number(at);
  if (!g || !Number.isSafeInteger(issuedAt) || !/^[A-Za-z0-9_-]{16,64}$/.test(nonce)) return null;
  const expected = await hmac(secret, `${game}.${at}.${nonce}`);
  // constant-time compare
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0 ? { game: g, issuedAt, nonce } : null;
}

/* ── Handler ─────────────────────────────────────────────────────────── */

const TICKET_MAX_AGE = 3 * 3600_000;
const ACTIVE_TTL = 5 * 60_000;
const used = new Map<string, number>();
let active: { at: number; ids: Set<string> } | null = null;
let checking: Promise<Set<string>> | null = null;
const claimLimiter = createRateLimiter(5, 10 * 60_000);
const ticketLimiter = createRateLimiter(30, 10 * 60_000);

/** Tests only. */
export function resetRewards() {
  used.clear();
  active = null;
  checking = null;
}

interface Deps {
  fetcher?: Fetcher;
  now?: () => number;
  nonce?: () => string;
}
const today = (t: number) => new Date(t).toISOString().slice(0, 10);

/** Which configured rewards are redeemable now: Admin API says ACTIVE, or merchant confirmed until a date (no Admin access). */
async function liveIds(env: RewardsEnv, rewards: RewardConfig[], deps: Deps): Promise<Set<string>> {
  const now = (deps.now ?? Date.now)();
  if (active && now - active.at < ACTIVE_TTL) return active.ids;
  // One check at a time per instance: a crowd opening the games never fans out to the Admin API.
  checking ??= (async () => {
    const cfg = shopifyConfig(env);
    const ids = new Set<string>();
    for (const r of rewards) {
      if (cfg.admin) {
        try {
          const st = await codeStatus(cfg, r.code, deps.fetcher, new Date(now));
          if (st?.active) ids.add(r.id);
        } catch {
          /* unverifiable right now → not offered */
        }
      } else if (r.merchantConfirmedUntil && today(now) <= r.merchantConfirmedUntil) ids.add(r.id);
    }
    active = { at: now, ids };
    return ids;
  })().finally(() => {
    checking = null;
  });
  return checking;
}

export async function handleRewards(req: Request, env: RewardsEnv, deps: Deps = {}): Promise<Response> {
  const url = new URL(req.url);
  const op = url.searchParams.get('op');
  const now = (deps.now ?? Date.now)();
  const { rewards, problems } = parseRewards(env.GAME_REWARDS);
  const secret = env.REWARDS_SECRET?.trim();
  const enabled = rewards.length > 0 && Boolean(secret && secret.length >= 32);
  const who = clientKey(req);

  if (op === 'list' && req.method === 'GET') {
    if (!enabled) return json(200, { ok: true, rewards: [], reason: 'not-configured', problems: secret && secret.length >= 32 ? problems : [...problems, 'REWARDS_SECRET missing or shorter than 32 characters'] });
    const ids = await liveIds(env, rewards, deps);
    return json(200, {
      ok: true,
      rewards: rewards.filter((r) => ids.has(r.id)).map((r) => ({ id: r.id, game: r.game, minScore: r.minScore, requiresWin: r.requiresWin, label: r.label, description: r.description, conditions: r.conditions, minPlaySeconds: r.minPlaySeconds })),
    });
  }

  if (op === 'ticket' && req.method === 'GET') {
    if (!enabled) return json(404, { ok: false, reason: 'not-configured' });
    if (!ticketLimiter.take(who)) return json(429, { ok: false, error: 'Too many requests.' });
    const game = GAMES.find((g) => g === url.searchParams.get('game'));
    if (!game) return json(400, { ok: false, error: 'Unknown game.' });
    const ids = await liveIds(env, rewards, deps);
    if (!rewards.some((r) => r.game === game && ids.has(r.id))) return json(404, { ok: false, reason: 'no-live-reward' });
    const nonce = deps.nonce?.() ?? b64(crypto.getRandomValues(new Uint8Array(18)).buffer);
    return json(200, { ok: true, ticket: await signTicket(secret!, game, now, nonce) });
  }

  if (op === 'claim' && req.method === 'POST') {
    if (!sameOrigin(req)) return json(403, { ok: false, error: 'Forbidden.' });
    if (!enabled) return json(404, { ok: false, reason: 'not-configured' });
    if (!claimLimiter.take(who)) return json(429, { ok: false, error: 'Too many claims. Try again later.' });
    const body = await readJson(req, 2_000);
    if (!body.ok) return json(body.status, { ok: false, error: body.error });
    const o = (body.value ?? {}) as Record<string, unknown>;
    const reward = rewards.find((r) => r.id === o.rewardId);
    const t = await verifyTicket(secret!, o.ticket);
    const score = Number(o.score);
    if (!reward || !t || t.game !== reward.game) return json(400, { ok: false, error: 'This reward can’t be claimed from this game.' });
    if (now - t.issuedAt > TICKET_MAX_AGE) return json(400, { ok: false, error: 'This game session expired. Play again to claim.' });
    if (now - t.issuedAt < reward.minPlaySeconds * 1000) return json(400, { ok: false, error: 'That was quick! Play a full round to claim.' });
    if (used.has(t.nonce)) return json(409, { ok: false, error: 'This game session already claimed its reward.' });
    if (!Number.isSafeInteger(score) || score < reward.minScore || (reward.requiresWin && o.won !== true)) return json(400, { ok: false, error: 'Not earned yet. Keep playing :)' });
    // Reserve the ticket BEFORE any await, so two simultaneous claims can't both pass.
    used.set(t.nonce, now);
    const ids = await liveIds(env, rewards, deps);
    if (!ids.has(reward.id)) {
      used.delete(t.nonce);
      return json(410, { ok: false, error: 'This reward is not active right now.' });
    }
    for (const [n, at] of used) if (now - at > TICKET_MAX_AGE) used.delete(n);
    return json(200, { ok: true, code: reward.code, label: reward.label, description: reward.description, conditions: reward.conditions });
  }

  return json(405, { ok: false, error: 'Unknown operation.' }, { Allow: 'GET, POST' });
}
