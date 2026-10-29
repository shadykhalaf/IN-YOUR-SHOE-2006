import { Analytics } from '@vercel/analytics/react';

/**
 * Standard Vercel Web Analytics (page views only, no custom events, no
 * fingerprinting). Outside a Vercel deployment the script request simply
 * 404s and nothing is recorded; no environment variable is needed.
 */
export default function VercelAnalytics() {
  return <Analytics mode="production" />;
}
