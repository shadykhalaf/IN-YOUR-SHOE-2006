import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { buildSupportMail, DEFAULT_SUPPORT_TO, handleSupport, recipient, validateSupport, type Sender } from '../../api/_lib/support';
import { createRateLimiter } from '../../api/_lib/http';
import { WALLPAPERS } from '../data/assets';
import { DEFAULT_WALLPAPER } from '../state/preferences';
import { concept, official } from '../data/copy';
import { subscribe } from '../lib/newsletter';

const root = resolve(__dirname, '../..');
const good = { email: 'Customer@Example.com', name: 'Mona', order: '#1234', topic: 'Delivery', subject: 'Where is my order?', message: 'Hi IYS,\nmy order has not arrived yet.', website: '' };
const req = (body: unknown, headers: Record<string, string> = {}, method = 'POST') =>
  new Request('https://retro.example/api/support-email', {
    method,
    headers: { 'content-type': 'application/json', origin: 'https://retro.example', host: 'retro.example', ...headers },
    body: method === 'GET' ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
const env = { RESEND_API_KEY: 'test-key', SUPPORT_FROM_EMAIL: 'IYS Mail <mail@verified.example>' };

describe('IYS MAIL support API', () => {
  it('validates and normalises a good request', () => {
    const r = validateSupport(good);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.email).toBe('customer@example.com');
  });
  it.each([
    ['bad email', { ...good, email: 'nope' }],
    ['missing name', { ...good, name: '' }],
    ['unknown topic', { ...good, topic: 'Hack' }],
    ['long subject', { ...good, subject: 'x'.repeat(121) }],
    ['long message', { ...good, message: 'x'.repeat(4001) }],
    ['odd order number', { ...good, order: '<script>' }],
    ['unexpected field', { ...good, admin: 'yes' }],
    ['non-string field', { ...good, name: 42 }],
    ['honeypot filled', { ...good, website: 'http://spam' }],
    ['array body', [good]],
  ])('rejects %s', (_, body) => {
    expect(validateSupport(body).ok).toBe(false);
  });

  it('sends to orders@inyourshoe.com with Reply-To = customer, never spoofing From', async () => {
    const send = vi.fn<Sender>(async () => true);
    const res = await handleSupport(req(good), env, send, new Date('2026-09-29T12:00:00Z'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    const mail = send.mock.calls[0]![0];
    expect(mail.to).toBe(DEFAULT_SUPPORT_TO);
    expect(DEFAULT_SUPPORT_TO).toBe('orders@inyourshoe.com');
    expect(mail.from).toBe(env.SUPPORT_FROM_EMAIL);
    expect(mail.replyTo).toBe('customer@example.com');
    expect(mail.subject).toBe('[IYS Support] Where is my order?');
    expect(mail.text).toContain('Source:\nIYS MAIL — IYS Retro V2');
    expect(mail.text).toContain('Order Number:\n#1234');
    expect(send.mock.calls[0]![1]).toBe('test-key');
  });

  it('rejects wrong method, content type, origin, oversize and malformed bodies', async () => {
    const send = vi.fn<Sender>(async () => true);
    expect((await handleSupport(req(null, {}, 'GET'), env, send)).status).toBe(405);
    expect((await handleSupport(req(good, { 'content-type': 'text/plain' }), env, send)).status).toBe(415);
    expect((await handleSupport(req(good, { origin: 'https://evil.example' }), env, send)).status).toBe(403);
    expect((await handleSupport(req('{not json'), env, send)).status).toBe(400);
    expect((await handleSupport(req({ ...good, message: 'x'.repeat(17000) }), env, send)).status).toBe(413);
    expect(send).not.toHaveBeenCalled();
  });

  it('never fakes success: missing config → 503, provider failure → 502, no secrets leaked', async () => {
    expect((await handleSupport(req(good), {}, vi.fn<Sender>(async () => true))).status).toBe(503);
    const r = await handleSupport(req(good), env, vi.fn<Sender>(async () => { throw new Error('provider exploded: key test-key'); }));
    expect(r.status).toBe(502);
    const text = await r.text();
    expect(text).not.toContain('test-key');
    expect(text).not.toContain('exploded');
  });

  it('says "not connected" (503 + reason) so the form can offer the email app instead of pretending', async () => {
    const r = await handleSupport(req(good), {}, vi.fn<Sender>(async () => true));
    expect(r.status).toBe(503);
    expect(await r.json()).toMatchObject({ ok: false, reason: 'not-connected' });
  });

  it('always delivers to orders@inyourshoe.com; a test inbox only in explicit test mode, marked [TEST]', async () => {
    expect(recipient({ SUPPORT_TO_EMAIL: 'qa@example.com' })).toEqual({ to: 'orders@inyourshoe.com', test: false });
    expect(recipient({ SUPPORT_TO_EMAIL: 'not an email', SUPPORT_TEST_MODE: '1' })).toEqual({ to: 'orders@inyourshoe.com', test: false });
    expect(recipient({ SUPPORT_TO_EMAIL: 'QA@Example.com', SUPPORT_TEST_MODE: '1' })).toEqual({ to: 'qa@example.com', test: true });
    const send = vi.fn<Sender>(async () => true);
    await handleSupport(req(good), { ...env, SUPPORT_TO_EMAIL: 'qa@example.com', SUPPORT_TEST_MODE: '1' }, send, new Date(), createRateLimiter(5, 60_000));
    expect(send.mock.calls[0]![0].to).toBe('qa@example.com');
    expect(send.mock.calls[0]![0].subject).toBe('[TEST] [IYS Support] Where is my order?');
  });

  it('rate-limits real sends per client (429) without calling the provider', async () => {
    const send = vi.fn<Sender>(async () => true);
    const limiter = createRateLimiter(2, 60_000, () => 0);
    const statuses = [];
    for (let i = 0; i < 3; i++) statuses.push((await handleSupport(req(good, { 'x-forwarded-for': '203.0.113.9' }), env, send, new Date(), limiter)).status);
    expect(statuses).toEqual([200, 200, 429]);
    expect(send).toHaveBeenCalledTimes(2);
    // another client is unaffected
    expect((await handleSupport(req(good, { 'x-forwarded-for': '198.51.100.4' }), env, send, new Date(), limiter)).status).toBe(200);
  });

  it('forwards a well-formed draft key as the provider idempotency key and ignores junk', async () => {
    const send = vi.fn<Sender>(async () => true);
    const limiter = createRateLimiter(10, 60_000);
    await handleSupport(req(good, { 'x-idempotency-key': '0b7e2c9a-1f4d-4c55-9a51-2b8f0c1d2e3f' }), env, send, new Date(), limiter);
    await handleSupport(req(good, { 'x-idempotency-key': 'bad key; drop table' }), env, send, new Date(), limiter);
    expect(send.mock.calls[0]![2]).toEqual({ idempotencyKey: '0b7e2c9a-1f4d-4c55-9a51-2b8f0c1d2e3f' });
    expect(send.mock.calls[1]![2]).toBeUndefined();
  });

  it('builds a plain-text message with every field', () => {
    const v = validateSupport(good);
    if (!v.ok) throw new Error('invalid');
    const m = buildSupportMail(v.value, { from: 'a@b.co', to: 'orders@inyourshoe.com' }, new Date('2026-09-29T12:00:00Z'));
    for (const s of ['New support message from IYS Retro V2', 'Name:\nMona', 'Customer Email:\ncustomer@example.com', 'Topic:\nDelivery', 'Submitted:\n2026-09-29T12:00:00.000Z']) expect(m.text).toContain(s);
  });
});

describe('IYS NEWSLETTER adapter', () => {
  it('reports not-configured and never returns the code without an endpoint', async () => {
    const f = vi.fn();
    expect(await subscribe('a@b.co', null, f as unknown as typeof fetch)).toEqual({ status: 'not-configured' });
    expect(f).not.toHaveBeenCalled();
  });
  it('reveals IYS10 only on a confirmed { ok: true } signup', async () => {
    const ok = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    expect(await subscribe('a@b.co', '/signup', ok as unknown as typeof fetch)).toEqual({ status: 'subscribed', code: 'IYS10' });
    const soft = vi.fn(async () => new Response(JSON.stringify({ ok: false }), { status: 200 }));
    expect((await subscribe('a@b.co', '/signup', soft as unknown as typeof fetch)).status).toBe('error');
    const fail = vi.fn(async () => new Response('nope', { status: 500 }));
    expect((await subscribe('a@b.co', '/signup', fail as unknown as typeof fetch)).status).toBe('error');
    expect((await subscribe('bad', '/signup', ok as unknown as typeof fetch)).status).toBe('invalid');
  });
});

describe('wallpapers', () => {
  it('every preset source exists in public/ and ids are unique', () => {
    expect(new Set(WALLPAPERS.map((w) => w.id)).size).toBe(WALLPAPERS.length);
    for (const w of WALLPAPERS) if (w.src) expect(existsSync(resolve(root, 'public', w.src.replace(/^\//, ''))), w.src).toBe(true);
    expect(WALLPAPERS.find((w) => w.id === 'blue')?.src).toBeNull();
    expect(WALLPAPERS.find((w) => w.id === 'hills')?.src).toBe('/iys/os/hills.svg');
  });

  it('Purbale Catchy is a Stretch preset whose 1672×940 image is precached like the other iys/os assets, never the default', () => {
    const w = WALLPAPERS.find((x) => x.id === 'purbale-catchy');
    expect(w).toEqual({ id: 'purbale-catchy', label: 'Purbale Catchy', src: '/iys/os/purbale-catchy.webp', mode: 'stretch' });
    const file = readFileSync(resolve(root, 'public/iys/os/purbale-catchy.webp'));
    expect(file.subarray(8, 12).toString()).toBe('WEBP');
    expect(file.length).toBeLessThan(1_500_000); // workbox maximumFileSizeToCacheInBytes
    expect(readFileSync(resolve(root, 'vite.config.ts'), 'utf8')).toContain("'iys/os/*'");
    expect(WALLPAPERS[0]!.id).toBe('hills');
    expect(DEFAULT_WALLPAPER).toEqual({ kind: 'preset', id: 'hills' });
  });
});

describe('routing safety', () => {
  it('the SPA rewrite never swallows /api/*', () => {
    const vercel = JSON.parse(readFileSync(resolve(root, 'vercel.json'), 'utf8')) as { rewrites: { source: string }[] };
    const re = new RegExp(`^${vercel.rewrites[0]!.source}$`);
    expect(re.test('/api/support-email')).toBe(false);
    for (const p of ['/', '/showcase', '/shop', '/search', '/favorites', '/stores', '/product/x', '/collections/all-kids-products']) expect(re.test(p), p).toBe(true);
    for (const p of ['/assets/a.js', '/iys/os/hills.svg', '/catalogue/p-00.json', '/sw.js', '/manifest.webmanifest']) expect(re.test(p), p).toBe(false);
  });
});

describe('concept copy', () => {
  it('Catchy was here XD is concept copy, not official IYS language', () => {
    expect(concept.catchy.footer).toBe('Catchy was here XD');
    expect(JSON.stringify(official)).not.toContain('Catchy');
    expect(concept.mail.title).toBe('IYS MAIL');
    expect(concept.newsletter.title).toBe('IYS NEWSLETTER');
  });
});
