/**
 * IYS MAIL → real support email (server-side only).
 *
 * Pure validation + message building + a request handler that takes its
 * environment and mail sender as arguments, so it can be unit-tested without
 * network or secrets. The Vercel function in ../support-email.ts wires it to
 * process.env and the Resend REST API.
 *
 * Never logs customer data. Never returns provider errors to the client.
 */
import { clientKey, createRateLimiter } from './http.js';

export const SUPPORT_TOPICS = ['Order question', 'Delivery', 'Product question', 'Payment', 'Store question', 'Other'] as const;
export type SupportTopic = (typeof SUPPORT_TOPICS)[number];

export const DEFAULT_SUPPORT_TO = 'orders@inyourshoe.com';

export const LIMITS = {
  body: 16_000,
  email: 254,
  name: 80,
  order: 40,
  subject: 120,
  message: 4000,
} as const;

const FIELDS = ['email', 'name', 'order', 'topic', 'subject', 'message', 'website'] as const;

export interface SupportRequest {
  email: string;
  name: string;
  order: string;
  topic: SupportTopic;
  subject: string;
  message: string;
}

export type ValidationResult = { ok: true; value: SupportRequest } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;
/** Single-line fields: collapse any line breaks / control chars. */
const oneLine = (s: string) => s.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
/** Multi-line message: keep newlines, drop other control chars. */
const multiLine = (s: string) => s.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim();

export const isValidEmail = (s: string) => s.length <= LIMITS.email && EMAIL_RE.test(s);

export function validateSupport(input: unknown): ValidationResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, error: 'Malformed request.' };
  const o = input as Record<string, unknown>;
  for (const k of Object.keys(o)) if (!(FIELDS as readonly string[]).includes(k)) return { ok: false, error: 'Unexpected field.' };
  for (const k of FIELDS) if (o[k] !== undefined && typeof o[k] !== 'string') return { ok: false, error: 'Malformed request.' };
  // Honeypot: real people never see or fill this field.
  if (typeof o.website === 'string' && o.website.trim() !== '') return { ok: false, error: 'Rejected.' };

  const email = oneLine((o.email as string) ?? '').toLowerCase();
  const name = oneLine((o.name as string) ?? '');
  const order = oneLine((o.order as string) ?? '');
  const topic = oneLine((o.topic as string) ?? '');
  const subject = oneLine((o.subject as string) ?? '');
  const message = multiLine((o.message as string) ?? '');

  if (!isValidEmail(email)) return { ok: false, error: 'Please enter a valid email address.' };
  if (!name || name.length > LIMITS.name) return { ok: false, error: `Please enter your name (max ${LIMITS.name} characters).` };
  if (order.length > LIMITS.order || (order && !/^[A-Za-z0-9#\- ]+$/.test(order))) return { ok: false, error: 'Order number can only use letters, numbers, # and -.' };
  if (!(SUPPORT_TOPICS as readonly string[]).includes(topic)) return { ok: false, error: 'Please choose a topic.' };
  if (!subject || subject.length > LIMITS.subject) return { ok: false, error: `Please add a subject (max ${LIMITS.subject} characters).` };
  if (message.length < 2 || message.length > LIMITS.message) return { ok: false, error: `Please write a message (max ${LIMITS.message} characters).` };
  return { ok: true, value: { email, name, order, topic: topic as SupportTopic, subject, message } };
}

export interface OutgoingMail {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  text: string;
}

export function buildSupportMail(v: SupportRequest, env: { from: string; to: string }, now: Date): OutgoingMail {
  return {
    from: env.from,
    to: env.to,
    replyTo: v.email,
    subject: `[IYS Support] ${v.subject}`,
    text: [
      'New support message from IYS Retro V2',
      '',
      `Name:\n${v.name}`,
      '',
      `Customer Email:\n${v.email}`,
      '',
      `Order Number:\n${v.order || '—'}`,
      '',
      `Topic:\n${v.topic}`,
      '',
      `Message:\n${v.message}`,
      '',
      `Submitted:\n${now.toISOString()}`,
      '',
      'Source:\nIYS MAIL — IYS Retro V2',
    ].join('\n'),
  };
}

export interface SupportEnv {
  RESEND_API_KEY?: string;
  SUPPORT_FROM_EMAIL?: string;
  /** Only honoured with SUPPORT_TEST_MODE=1 (a designated test inbox; subject gets "[TEST] "). */
  SUPPORT_TO_EMAIL?: string;
  SUPPORT_TEST_MODE?: string;
}
/** What the provider said. `true` / `false` are accepted as shorthand for accepted / unavailable. */
export type SendResult = { ok: true } | { ok: false; kind: 'rejected' | 'unavailable'; status?: number };
export type Sender = (mail: OutgoingMail, apiKey: string, opts?: { idempotencyKey?: string }) => Promise<boolean | SendResult>;

/**
 * Where mail goes: always orders@inyourshoe.com. A test inbox is used only
 * when the deployment is explicitly in test mode, and those messages are
 * marked [TEST], so nothing is ever silently redirected.
 */
export function recipient(env: SupportEnv): { to: string; test: boolean } {
  const test = env.SUPPORT_TEST_MODE?.trim() === '1';
  const override = env.SUPPORT_TO_EMAIL?.trim().toLowerCase();
  if (test && override && isValidEmail(override)) return { to: override, test: true };
  return { to: DEFAULT_SUPPORT_TO, test: false };
}

/** Real send attempts per client: 5 per 10 minutes (per warm instance; see createRateLimiter). */
const sendLimiter = createRateLimiter(5, 10 * 60_000);

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

/** Origin must match the host the request was sent to (same-origin form only). */
function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  try {
    return Boolean(host) && new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * GET /api/support-email?status → is THIS deployment able to send? (no secrets,
 * no addresses besides the public one). Lets anyone check a preview in a browser.
 */
function status(env: SupportEnv): Response {
  const { to, test } = recipient(env);
  return json(200, {
    ok: true,
    service: 'IYS MAIL',
    provider: 'resend',
    configured: Boolean(env.SUPPORT_FROM_EMAIL?.trim() && env.RESEND_API_KEY?.trim()),
    missing: [!env.RESEND_API_KEY?.trim() && 'RESEND_API_KEY', !env.SUPPORT_FROM_EMAIL?.trim() && 'SUPPORT_FROM_EMAIL'].filter(Boolean),
    deliversTo: test ? 'test inbox (SUPPORT_TEST_MODE=1)' : to,
  });
}

export async function handleSupport(req: Request, env: SupportEnv, send: Sender, now = new Date(), limiter: { take(key: string): boolean } = sendLimiter): Promise<Response> {
  if (req.method === 'GET' && new URL(req.url).searchParams.has('status')) return status(env);
  if (req.method !== 'POST') return new Response(JSON.stringify({ ok: false, error: 'Method not allowed.' }), { status: 405, headers: { Allow: 'POST', 'Content-Type': 'application/json' } });
  if (!(req.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) return json(415, { ok: false, error: 'Unsupported content type.' });
  if (!sameOrigin(req)) return json(403, { ok: false, error: 'Forbidden.' });

  const raw = await req.text();
  if (raw.length > LIMITS.body) return json(413, { ok: false, error: 'Message too large.' });
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return json(400, { ok: false, error: 'Malformed request.' });
  }
  const v = validateSupport(parsed);
  if (!v.ok) return json(400, { ok: false, error: v.error });

  const from = env.SUPPORT_FROM_EMAIL?.trim();
  const key = env.RESEND_API_KEY?.trim();
  const { to, test } = recipient(env);
  if (!from || !key) return json(503, { ok: false, reason: 'not-connected', error: 'IYS MAIL is not connected yet. Please email orders@inyourshoe.com directly.' });
  if (!limiter.take(clientKey(req))) return json(429, { ok: false, error: 'Too many messages in a row. Please wait a few minutes and try again.' });

  // The form sends one key per draft: a double click (or a retry after a lost response) can't send twice.
  const idem = req.headers.get('x-idempotency-key') ?? '';
  const mail = buildSupportMail(v.value, { from, to }, now);
  if (test) mail.subject = `[TEST] ${mail.subject}`;
  let result: SendResult;
  try {
    const r = await send(mail, key, /^[A-Za-z0-9-]{8,64}$/.test(idem) ? { idempotencyKey: idem } : undefined);
    result = r === true ? { ok: true } : r === false ? { ok: false, kind: 'unavailable' } : r;
  } catch {
    result = { ok: false, kind: 'unavailable' };
  }
  if (result.ok) return json(200, { ok: true });
  // Status codes only: never the message, the customer or the provider's body.
  console.error(`[iys-mail] provider ${result.kind}${result.status ? ` (HTTP ${result.status})` : ''}`);
  if (result.kind === 'rejected')
    return json(502, { ok: false, reason: 'provider-rejected', error: 'The mail service refused this message, so it was NOT sent. Please email orders@inyourshoe.com directly.' });
  return json(502, { ok: false, reason: 'provider-unavailable', error: 'Mail server did not accept the message. Please try again.' });
}

/**
 * Resend REST API (https://resend.com/docs/api-reference/emails/send-email).
 * Bounded retry: one more attempt after a network error, 429 or 5xx, and only
 * with an idempotency key (so a retry can never deliver twice) or after a 429
 * (which means "not accepted"). 4xx = rejected (bad key, unverified sender...).
 */
export function createResendSender(fetcher: typeof fetch = fetch, pause = (ms: number) => new Promise((r) => setTimeout(r, ms))): Sender {
  return async (mail, apiKey, opts) => {
    let last: SendResult = { ok: false, kind: 'unavailable' };
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt) await pause(700);
      let status = 0;
      try {
        const res = await fetcher('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', ...(opts?.idempotencyKey ? { 'Idempotency-Key': `iys-mail-${opts.idempotencyKey}` } : {}) },
          body: JSON.stringify({ from: mail.from, to: [mail.to], reply_to: mail.replyTo, subject: mail.subject, text: mail.text }),
          signal: AbortSignal.timeout(8000),
        });
        status = res.status;
        if (res.ok) return { ok: true };
      } catch {
        status = 0;
      }
      const transient = status === 0 || status === 429 || status >= 500;
      last = transient ? { ok: false, kind: 'unavailable', status: status || undefined } : { ok: false, kind: 'rejected', status };
      if (!transient || !(opts?.idempotencyKey || status === 429)) break;
    }
    return last;
  };
}
export const resendSender: Sender = createResendSender();
