/**
 * IYS MAIL delivery path, end to end minus the real provider:
 *   form → deliver() (client retry) → handleSupport() → Sender (Resend) → result.
 * No email is sent: every network boundary is a fake.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createRateLimiter } from '../../api/_lib/http';
import { createResendSender, handleSupport, type OutgoingMail, type Sender } from '../../api/_lib/support';
import { concept } from '../data/copy';
import { deliver } from '../lib/supportMail';

const root = resolve(__dirname, '../..');
const good = { email: 'shopper@example.com', name: 'Test', order: '', topic: 'Delivery', subject: 'Where is my order?', message: 'automated test', website: '' };
const env = { RESEND_API_KEY: 're_fixture_not_real', SUPPORT_FROM_EMAIL: 'IYS Mail <mail@verified.example>' };
const req = (body: unknown, url = 'https://retro.example/api/support-email', method = 'POST', headers: Record<string, string> = {}) =>
  new Request(url, { method, headers: { 'content-type': 'application/json', origin: 'https://retro.example', host: 'retro.example', ...headers }, body: method === 'GET' ? undefined : JSON.stringify(body) });
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const noWait = () => Promise.resolve();

describe('the hosted function can load (root cause of "Could not reach the mail server")', () => {
  it('every relative import under api/ names its file (Node ESM on Vercel refuses extensionless paths)', () => {
    const files: string[] = [];
    const walk = (d: string) => readdirSync(d).forEach((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : f.endsWith('.ts') && files.push(join(d, f))));
    walk(join(root, 'api'));
    const bad = files.flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/from\s+'(\.{1,2}\/[^']+)'/g)].map((m) => m[1]!).filter((p) => !/\.(js|mjs)$/.test(p)).map((p) => `${f.replace(root, '')}: ${p}`));
    expect(files.length).toBeGreaterThanOrEqual(8);
    expect(bad).toEqual([]);
  });
});

describe('GET /api/support-email?status: can THIS deployment send?', () => {
  it('not configured → says which variables are missing, never a secret', async () => {
    const r = await handleSupport(req(null, 'https://retro.example/api/support-email?status', 'GET'), {}, vi.fn<Sender>());
    expect(await r.json()).toMatchObject({ ok: true, configured: false, missing: ['RESEND_API_KEY', 'SUPPORT_FROM_EMAIL'], deliversTo: 'orders@inyourshoe.com' });
  });
  it('configured → true, and the key is not in the answer', async () => {
    const r = await handleSupport(req(null, 'https://retro.example/api/support-email?status', 'GET'), env, vi.fn<Sender>());
    const text = await r.text();
    expect(JSON.parse(text)).toMatchObject({ configured: true, missing: [] });
    expect(text).not.toContain('re_fixture');
  });
});

describe('provider answers are reported truthfully', () => {
  it('rejected (bad key / unverified sender) → 502 provider-rejected, "NOT sent"', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const r = await handleSupport(req(good), env, vi.fn<Sender>(async () => ({ ok: false, kind: 'rejected', status: 403 })), new Date(), createRateLimiter(5, 60_000));
    expect(r.status).toBe(502);
    const body = (await r.json()) as { reason: string; error: string };
    expect(body.reason).toBe('provider-rejected');
    expect(body.error).toContain('NOT sent');
    expect(log.mock.calls.flat().join(' ')).toContain('HTTP 403');
    expect(log.mock.calls.flat().join(' ')).not.toContain('shopper@example.com');
    log.mockRestore();
  });

  const mail: OutgoingMail = { from: 'a@b.co', to: 'orders@inyourshoe.com', replyTo: 'c@d.co', subject: 's', text: 't' };
  it('Resend: a transient 5xx is retried once with the SAME idempotency key', async () => {
    const f = vi.fn<typeof fetch>().mockResolvedValueOnce(json(500, {})).mockResolvedValueOnce(json(200, { id: 'x' }));
    expect(await createResendSender(f, noWait)(mail, 'k', { idempotencyKey: 'draft-1234abcd' })).toEqual({ ok: true });
    expect(f).toHaveBeenCalledTimes(2);
    const keys = f.mock.calls.map((c) => (c[1]!.headers as Record<string, string>)['Idempotency-Key']);
    expect(keys).toEqual(['iys-mail-draft-1234abcd', 'iys-mail-draft-1234abcd']);
  });
  it('Resend: a 4xx is a rejection and is never retried', async () => {
    const f = vi.fn<typeof fetch>().mockResolvedValue(json(403, { message: 'domain not verified' }));
    expect(await createResendSender(f, noWait)(mail, 'k', { idempotencyKey: 'draft-1234abcd' })).toEqual({ ok: false, kind: 'rejected', status: 403 });
    expect(f).toHaveBeenCalledTimes(1);
  });
  it('Resend: no idempotency key → no blind retry after a network error (it could deliver twice)', async () => {
    const f = vi.fn<typeof fetch>().mockRejectedValue(new Error('socket hang up'));
    expect(await createResendSender(f, noWait)(mail, 'k')).toEqual({ ok: false, kind: 'unavailable', status: undefined });
    expect(f).toHaveBeenCalledTimes(1);
  });
});

describe('IYS MAIL form delivery (client): bounded retry, never a false "sent"', () => {
  const fetcher = (...answers: (Response | Error)[]) => {
    const f = vi.fn<typeof fetch>();
    for (const a of answers) a instanceof Error ? f.mockRejectedValueOnce(a) : f.mockResolvedValueOnce(a);
    return f;
  };
  const keysOf = (f: ReturnType<typeof fetcher>) => f.mock.calls.map((c) => (c[1]!.headers as Record<string, string>)['X-Idempotency-Key']);

  it('accepted → sent (one request)', async () => {
    const f = fetcher(json(200, { ok: true }));
    expect(await deliver(good, 'draft-1', undefined, noWait, f)).toEqual({ kind: 'sent' });
    expect(f).toHaveBeenCalledTimes(1);
  });
  it('unreachable endpoint → 3 tries max with the same key, then the honest "could not reach"', async () => {
    const f = fetcher(new TypeError('Failed to fetch'), new TypeError('Failed to fetch'), new TypeError('Failed to fetch'));
    const notes: string[] = [];
    expect(await deliver(good, 'draft-2', (n) => notes.push(n), noWait, f)).toEqual({ kind: 'failed', message: concept.mail.failed });
    expect(f).toHaveBeenCalledTimes(3);
    expect(new Set(keysOf(f))).toEqual(new Set(['draft-2']));
    expect(notes).toEqual([concept.mail.retrying, concept.mail.retrying]);
  });
  it('crashed function (500, not JSON) then OK → sent after one automatic retry', async () => {
    const f = fetcher(new Response('A server error has occurred FUNCTION_INVOCATION_FAILED', { status: 500 }), json(200, { ok: true }));
    expect(await deliver(good, 'draft-3', undefined, noWait, f)).toEqual({ kind: 'sent' });
    expect(f).toHaveBeenCalledTimes(2);
  });
  it('crashed function every time → says it was NOT sent, with the HTTP status', async () => {
    const crash = () => new Response('FUNCTION_INVOCATION_FAILED', { status: 500 });
    expect(await deliver(good, 'draft-4', undefined, noWait, fetcher(crash(), crash(), crash()))).toEqual({ kind: 'failed', message: concept.mail.serverError(500) });
    expect(concept.mail.serverError(500)).toContain('NOT sent');
  });
  it('missing credentials → not connected, no retry', async () => {
    const f = fetcher(json(503, { ok: false, reason: 'not-connected', error: 'x' }));
    expect(await deliver(good, 'draft-5', undefined, noWait, f)).toEqual({ kind: 'not-connected' });
    expect(f).toHaveBeenCalledTimes(1);
  });
  it('provider rejection, invalid input and rate limits are definite: shown, not retried', async () => {
    for (const [status, body] of [
      [502, { ok: false, reason: 'provider-rejected', error: 'The mail service refused this message, so it was NOT sent.' }],
      [400, { ok: false, error: 'Please enter a valid email address.' }],
      [429, { ok: false, error: 'Too many messages in a row.' }],
    ] as const) {
      const f = fetcher(json(status, body));
      expect(await deliver(good, 'draft-6', undefined, noWait, f)).toEqual({ kind: 'failed', message: body.error });
      expect(f).toHaveBeenCalledTimes(1);
    }
  });
  it('provider temporarily down → retried, still the same key', async () => {
    const f = fetcher(json(502, { ok: false, reason: 'provider-unavailable', error: 'Mail server did not accept the message. Please try again.' }), json(200, { ok: true }));
    expect(await deliver(good, 'draft-7', undefined, noWait, f)).toEqual({ kind: 'sent' });
    expect(keysOf(f)).toEqual(['draft-7', 'draft-7']);
  });
});
