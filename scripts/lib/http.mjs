/**
 * Polite HTTP client for the PUBLIC In Your Shoe storefront.
 *
 * - Egypt market: every request carries the storefront's own localisation
 *   cookies (`localization=EG; cart_currency=EGP`) so prices come back in EGP
 *   from the Egyptian storefront and not an IP-localised market.
 * - Sequential: one request at a time, paced (`PACE_MS`, default 4.5 s for
 *   storefront pages/JSON, 150 ms for the image CDN).
 * - 429 / 5xx are retried with the server's Retry-After, or exponential
 *   backoff, up to 6 times. Anything else fails loudly.
 * - Nothing behind a login, no private APIs, no credentials.
 *
 * Behind an HTTP proxy, run node with NODE_USE_ENV_PROXY=1 (Node ≥ 22.21).
 */
import { setTimeout as wait } from 'node:timers/promises';

export const ORIGIN = 'https://inyourshoe.com';
export const USER_AGENT = 'Mozilla/5.0 (compatible; IYS-Internet-2006-concept/1.0; public storefront research; +https://github.com/omarrakram/Concepts)';

const PACE = Number(process.env.PACE_MS ?? 4500);
const CDN_PACE = 150;
let last = 0;

const isCdn = (url) => url.includes('cdn.shopify.com') || url.includes('/cdn/shop/');

export async function get(url, { as = 'json', tries = 6, headers = {} } = {}) {
  const pace = isCdn(url) ? CDN_PACE : PACE;
  const since = Date.now() - last;
  if (since < pace) await wait(pace - since);
  last = Date.now();

  let res;
  try {
    res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: as === 'json' ? 'application/json' : as === 'text' ? 'text/html,application/xml;q=0.9,*/*;q=0.8' : '*/*',
        Cookie: 'localization=EG; cart_currency=EGP',
        ...headers,
      },
      signal: AbortSignal.timeout(45_000),
    });
  } catch (err) {
    if (tries > 0) {
      const backoff = 2 ** (7 - tries) * 1000;
      console.warn(`  ! network error (${err.message}) — retry in ${backoff / 1000}s`);
      await wait(backoff);
      return get(url, { as, tries: tries - 1, headers });
    }
    throw err;
  }

  if ((res.status === 429 || res.status >= 500) && tries > 0) {
    const retryAfter = Number(res.headers.get('retry-after'));
    const backoff = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** (7 - tries) * 4000;
    console.warn(`  ! ${res.status} ${url.replace(ORIGIN, '')} — waiting ${Math.round(backoff / 1000)}s`);
    await res.arrayBuffer().catch(() => {});
    await wait(backoff);
    return get(url, { as, tries: tries - 1, headers });
  }
  if (!res.ok) {
    const err = new Error(`${res.status} ${url}`);
    err.status = res.status;
    throw err;
  }
  if (as === 'json') return res.json();
  if (as === 'text') return res.text();
  if (as === 'response') return res;
  return Buffer.from(await res.arrayBuffer());
}
