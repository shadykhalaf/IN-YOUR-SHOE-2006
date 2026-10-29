/**
 * /api/commerce: Vercel Function (Node.js runtime, Web Request/Response).
 * Live Shopify mode is OFF unless the server env enables it; see
 * api/_lib/shopify.ts and docs/SHOPIFY_GO_LIVE_CHECKLIST.md.
 */
import { handleCommerce } from './_lib/commerce.js';

declare const process: { env: Record<string, string | undefined> };

const handler = (request: Request) =>
  handleCommerce(request, {
    COMMERCE_LIVE: process.env.COMMERCE_LIVE,
    COMMERCE_PUBLIC: process.env.COMMERCE_PUBLIC,
    SHOPIFY_STORE_DOMAIN: process.env.SHOPIFY_STORE_DOMAIN,
    SHOPIFY_STOREFRONT_PRIVATE_TOKEN: process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN,
    SHOPIFY_STOREFRONT_PUBLIC_TOKEN: process.env.SHOPIFY_STOREFRONT_PUBLIC_TOKEN,
    SHOPIFY_ADMIN_TOKEN: process.env.SHOPIFY_ADMIN_TOKEN,
    SHOPIFY_API_VERSION: process.env.SHOPIFY_API_VERSION,
  });

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
