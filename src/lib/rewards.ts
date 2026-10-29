/**
 * IYS GAMES rewards, client side. Talks to /api/rewards, which only ever
 * offers REAL merchant codes it has confirmed are active (see
 * api/_lib/rewards.ts). No reward configured or confirmed → this returns
 * nothing and the games look exactly as before.
 *
 * Network calls happen only when the deployment says the server side is set
 * up (VITE_GAME_REWARDS=1) and the kill switch is on (VITE_FEATURE_GAME_REWARDS).
 */
import { FEATURES } from '../config/features';

export const REWARDS_ENDPOINT = '/api/rewards';
const env = import.meta.env as Record<string, string | undefined>;
export const rewardsOn = () => FEATURES.gameRewards && env.VITE_GAME_REWARDS?.trim() === '1';

export interface PublicReward {
  id: string;
  game: string;
  minScore: number;
  requiresWin: boolean;
  label: string;
  description: string;
  conditions: string | null;
  minPlaySeconds: number;
}
export type Claim = { ok: true; code: string; label: string; description: string; conditions: string | null } | { ok: false; error: string };

const isReward = (r: unknown): r is PublicReward => {
  const o = r as PublicReward | null;
  return Boolean(o && typeof o.id === 'string' && typeof o.game === 'string' && Number.isSafeInteger(o.minScore) && typeof o.label === 'string' && typeof o.description === 'string');
};

let list: Promise<PublicReward[]> | null = null;

/** Rewards that are redeemable right now (asked once per page load; never includes codes). */
export function liveRewards(): Promise<PublicReward[]> {
  if (!rewardsOn()) return Promise.resolve([]);
  list ??= fetch(`${REWARDS_ENDPOINT}?op=list`, { signal: AbortSignal.timeout(6000) })
    .then((r) => (r.ok ? r.json() : null))
    .then((b: { ok?: boolean; rewards?: unknown[] } | null) => (b?.ok && Array.isArray(b.rewards) ? b.rewards.filter(isReward) : []))
    .catch(() => []);
  return list;
}

/** Tests only. */
export const resetRewardsCache = () => {
  list = null;
};

/** A signed play ticket for this run, or null when this game has no live reward. */
export async function playTicket(game: string): Promise<string | null> {
  try {
    const r = await fetch(`${REWARDS_ENDPOINT}?op=ticket&game=${encodeURIComponent(game)}`, { signal: AbortSignal.timeout(6000) });
    const b = (await r.json().catch(() => null)) as { ok?: boolean; ticket?: string } | null;
    return r.ok && b?.ok && typeof b.ticket === 'string' ? b.ticket : null;
  } catch {
    return null;
  }
}

/** The best live reward this run earned, if any (pure). */
export function earned(rewards: readonly PublicReward[], game: string, score: number, won: boolean): PublicReward | null {
  const ok = rewards.filter((r) => r.game === game && score >= r.minScore && (!r.requiresWin || won));
  return ok.sort((a, b) => b.minScore - a.minScore)[0] ?? null;
}

/** The next live reward this game could still unlock (for a "score N+ to unlock" hint). */
export function nextReward(rewards: readonly PublicReward[], game: string, score: number): PublicReward | null {
  const left = rewards.filter((r) => r.game === game && score < r.minScore);
  return left.sort((a, b) => a.minScore - b.minScore)[0] ?? null;
}

export async function claimReward(rewardId: string, ticket: string, score: number, won: boolean): Promise<Claim> {
  try {
    const r = await fetch(`${REWARDS_ENDPOINT}?op=claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rewardId, ticket, score, won }),
      signal: AbortSignal.timeout(8000),
    });
    const b = (await r.json().catch(() => null)) as Partial<Extract<Claim, { ok: true }>> & { error?: string } | null;
    if (r.ok && b?.ok && typeof b.code === 'string') return { ok: true, code: b.code, label: String(b.label ?? ''), description: String(b.description ?? ''), conditions: b.conditions ?? null };
    return { ok: false, error: typeof b?.error === 'string' ? b.error.slice(0, 160) : 'IYS couldn’t confirm the reward right now.' };
  } catch {
    return { ok: false, error: 'IYS couldn’t confirm the reward right now.' };
  }
}
