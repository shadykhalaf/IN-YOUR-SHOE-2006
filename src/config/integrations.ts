/**
 * External integrations — one explicit place, four separate concerns.
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

/**
 * 2. IYS NEWSLETTER — future signup provider. null = not connected yet.
 * Contract: POST JSON { email } → 2xx with JSON { ok: true } on a confirmed signup.
 */
export const NEWSLETTER_ENDPOINT: string | null = env(import.meta.env.VITE_NEWSLETTER_ENDPOINT);
/** Revealed only after the newsletter endpoint confirms a real signup. */
export const NEWSLETTER_DISCOUNT_CODE = 'IYS10';

/** 3. HELP › IYS Help & Support — Odoo form. null = placeholder state. */
export const ODOO_HELP_FORM_URL: string | null = env(import.meta.env.VITE_ODOO_HELP_FORM_URL);

/** 4. XCHANGE.EXE — Exchanges / Refunds Odoo form. null = placeholder state. */
export const ODOO_EXCHANGE_REFUND_FORM_URL: string | null = env(import.meta.env.VITE_ODOO_EXCHANGE_REFUND_FORM_URL);

/**
 * 5. CHECKOUT — the official In Your Shoe Egyptian storefront (unprefixed, EGP).
 * MY BAG hands its exact variants + quantities to this store's real Shopify
 * checkout through a public cart permalink (src/lib/checkout.ts). No keys.
 */
export const IYS_STOREFRONT_ORIGIN = 'https://inyourshoe.com';
