/**
 * /api/rewards: Vercel Function. Real merchant game rewards only; off unless
 * GAME_REWARDS + REWARDS_SECRET (+ Admin API access) are configured.
 * See api/_lib/rewards.ts and docs/SHOPIFY_GO_LIVE_CHECKLIST.md.
 */
import { handleRewards } from './_lib/rewards.js';

declare const process: { env: Record<string, string | undefined> };

const handler = (request: Request) =>
  handleRewards(request, {
    GAME_REWARDS: process.env.GAME_REWARDS,
    REWARDS_SECRET: process.env.REWARDS_SECRET,
    COMMERCE_LIVE: process.env.COMMERCE_LIVE,
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
