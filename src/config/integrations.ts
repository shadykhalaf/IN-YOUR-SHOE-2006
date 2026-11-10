/**
 * External integrations — one explicit place, one numbered entry per concern.
 * No secrets live here: everything below is a public URL/path. Server-side
 * secrets (the support-email provider key) live only in Vercel environment
 * variables read by api/support-email.ts.
 *
 * Public values can be set at build time via Vercel env vars (VITE_ prefix is
 * required for Vite to expose a value to the browser), or pasted here directly.
 */
const env = (v: string | undefined) => (v && v.trim() ? v.trim() : null);

/** 1. IYS MAIL — real support email, sent server-side (Resend). */
export const SUPPORT_EMAIL_ENDPOINT = '/api/support-email';
export const SUPPORT_EMAIL_TO = 'orders@inyourshoe.com';

/** 2. HELP › IYS Help & Support — Odoo form. null = placeholder state. */
export const ODOO_HELP_FORM_URL: string | null = env(import.meta.env.VITE_ODOO_HELP_FORM_URL);

/**
 * 3. CHECKOUT — the official In Your Shoe Egyptian storefront (unprefixed, EGP).
 * MY BAG hands its exact variants + quantities to this store's real Shopify
 * checkout through a public cart permalink (src/lib/checkout.ts). No keys.
 */
export const IYS_STOREFRONT_ORIGIN = 'https://inyourshoe.com';

/**
 * 4. THE REAL STORE, LIVE — the store's Supabase function (read from Shopify):
 *    action "fits"  each product's Fit (true to size, product metafield custom.fit)
 *    action "home"  the PUBLISHED theme's homepage sections + main menu, mirrored here
 * The key is Supabase's public anon key, the same one the store theme uses.
 * null endpoint = neither is shown (the site keeps its own homepage and menu).
 */
export const FIT_ENDPOINT: string | null =
  env(import.meta.env.VITE_FIT_ENDPOINT) ?? 'https://larkvlkettqrzgkoegvo.supabase.co/functions/v1/k2-ref';
export const FIT_KEY: string =
  env(import.meta.env.VITE_FIT_KEY) ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxhcmt2bGtldHRxcnpna29lZ3ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5Mjk3NDAsImV4cCI6MjEwODUwNTc0MH0.zCTAYW7C4AlP6MoMs1CKVBZ2LL9J58g771bwpOtHzwU';

export const STORE_FN_ENDPOINT = FIT_ENDPOINT;
export const STORE_FN_KEY = FIT_KEY;
