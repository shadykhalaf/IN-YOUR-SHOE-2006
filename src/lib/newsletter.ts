/**
 * IYS NEWSLETTER adapter — the only place that talks to a newsletter provider.
 * Until NEWSLETTER_ENDPOINT is configured it reports "not-configured" and never
 * pretends a signup happened. The discount code is only returned alongside a
 * confirmed { ok: true } response.
 */
import { NEWSLETTER_DISCOUNT_CODE, NEWSLETTER_ENDPOINT } from '../config/integrations';

export type SignupResult = { status: 'subscribed'; code: string } | { status: 'not-configured' } | { status: 'invalid' } | { status: 'error' };

export const isEmail = (s: string) => /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/.test(s) && s.length <= 254;

export async function subscribe(email: string, endpoint: string | null = NEWSLETTER_ENDPOINT, fetcher: typeof fetch = fetch): Promise<SignupResult> {
  if (!endpoint) return { status: 'not-configured' };
  const clean = email.trim().toLowerCase();
  if (!isEmail(clean)) return { status: 'invalid' };
  try {
    const res = await fetcher(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: clean }) });
    if (!res.ok) return { status: 'error' };
    const body = (await res.json().catch(() => null)) as { ok?: unknown } | null;
    return body?.ok === true ? { status: 'subscribed', code: NEWSLETTER_DISCOUNT_CODE } : { status: 'error' };
  } catch {
    return { status: 'error' };
  }
}
