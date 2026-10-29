/**
 * IYS MAIL client delivery (used by src/apps/Small/Mail.tsx). Pure apart from
 * fetch, so every outcome can be tested: sent, not connected, refused,
 * unreachable, crashed, and the bounded retry.
 */
import { SUPPORT_EMAIL_ENDPOINT } from '../config/integrations';
import { concept } from '../data/copy';

export type Delivery = { kind: 'sent' } | { kind: 'not-connected' } | { kind: 'failed'; message: string };
type Attempt = { status: number | null; body: { ok?: boolean; error?: string; reason?: string } | null };

/**
 * POST to the mail function with a bounded retry: up to 2 more tries (0.8 s,
 * then 2 s) only when nothing definite came back (no connection, a server
 * crash, provider temporarily down). Every try carries the SAME draft key, so
 * the server/provider can never deliver it twice. Definite answers (sent, not
 * connected, refused, invalid, rate-limited) are never retried.
 */
export async function deliver(form: Record<string, string>, key: string, onRetry: (note: string) => void = () => {}, wait = (ms: number) => new Promise((r) => setTimeout(r, ms)), fetcher: typeof fetch = (...a) => fetch(...a)): Promise<Delivery> {
  const once = async (): Promise<Attempt> => {
    try {
      const res = await fetcher(SUPPORT_EMAIL_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': key }, body: JSON.stringify(form), signal: AbortSignal.timeout(20_000) });
      return { status: res.status, body: (await res.json().catch(() => null)) as Attempt['body'] };
    } catch {
      return { status: null, body: null };
    }
  };
  const transient = (a: Attempt) => a.status === null || (a.status >= 500 && !a.body?.reason) || a.body?.reason === 'provider-unavailable';
  let a = await once();
  for (const ms of [800, 2000]) {
    if (!transient(a)) break;
    onRetry(concept.mail.retrying);
    await wait(ms);
    a = await once();
  }
  if (a.status !== null && a.status < 300 && a.body?.ok === true) return { kind: 'sent' };
  if (a.status === 503 && a.body?.reason === 'not-connected') return { kind: 'not-connected' };
  if (a.body?.error) return { kind: 'failed', message: a.body.error };
  return { kind: 'failed', message: a.status === null ? concept.mail.failed : concept.mail.serverError(a.status) };
}
