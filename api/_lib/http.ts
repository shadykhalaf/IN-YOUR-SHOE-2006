/**
 * Small, dependency-free helpers shared by the server functions in /api.
 * Web-standard Request/Response only (works on Vercel's Node runtime and in tests).
 */

export const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers } });

/** The request's Origin must be the host it was sent to (same-origin browser calls only). */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  try {
    return Boolean(host) && new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Best-effort client address for rate limiting (Vercel sets x-forwarded-for / x-real-ip). Never logged. */
export function clientKey(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return fwd || req.headers.get('x-real-ip') || 'unknown';
}

/** Read a JSON body with a hard size cap. */
export async function readJson(req: Request, maxBytes: number): Promise<{ ok: true; value: unknown } | { ok: false; status: number; error: string }> {
  if (!(req.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) return { ok: false, status: 415, error: 'Unsupported content type.' };
  const raw = await req.text();
  if (raw.length > maxBytes) return { ok: false, status: 413, error: 'Request too large.' };
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return { ok: false, status: 400, error: 'Malformed request.' };
  }
}

/**
 * Sliding-window rate limiter, in memory. Honest limits: on serverless it is
 * per warm instance (a burst spread over cold instances can exceed it). For a
 * hard global limit put Vercel WAF rate limiting / a shared KV in front (see
 * docs/SHOPIFY_GO_LIVE_CHECKLIST.md). Still stops a single client hammering.
 */
export function createRateLimiter(limit: number, windowMs: number, now: () => number = Date.now) {
  const hits = new Map<string, number[]>();
  return {
    take(key: string): boolean {
      const t = now();
      const list = (hits.get(key) ?? []).filter((x) => t - x < windowMs);
      if (list.length >= limit) {
        hits.set(key, list);
        return false;
      }
      list.push(t);
      hits.set(key, list);
      if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((x) => t - x < windowMs)) hits.delete(k);
      return true;
    },
  };
}
