/**
 * Conversion-pass switches: each new capability can be turned off on its own,
 * without touching the rest. Set at build time with the Vercel env var named
 * beside it ("0"/"false"/"off" = off), or edit the default here.
 *
 * Off means the site behaves as it did before that capability existed.
 * Live Shopify mode is NOT a flag here: it has its own explicit, credentialed
 * switch (see src/lib/commerce.ts and docs/SHOPIFY_GO_LIVE_CHECKLIST.md).
 */
const env = import.meta.env as Record<string, string | undefined>;
const flag = (name: string, fallback: boolean) => {
  const v = env[name]?.trim().toLowerCase();
  if (v === undefined || v === '') return fallback;
  return !['0', 'false', 'off', 'no'].includes(v);
};

export const FEATURES = {
  /** Desktop: MENU (top left) + MY BAG (top right) in the top strip. */
  topNav: flag('VITE_FEATURE_TOP_NAV', true),
  /** MY BAG: free-shipping progress + offers (only from verified merchant rules). */
  bagIncentives: flag('VITE_FEATURE_BAG_INCENTIVES', true),
  /** MY BAG: a few complementary, in-stock, real products ("u might like these"). */
  bagUpsell: flag('VITE_FEATURE_BAG_UPSELL', true),
  /** Every product page: MORE LIKE THIS carousel of real, in-stock products. */
  productRecs: flag('VITE_FEATURE_PRODUCT_RECS', true),
  /** Home: extra real-merchandise shelves below JUST DROPPED. */
  homeShelves: flag('VITE_FEATURE_HOME_SHELVES', true),
  /** Game completion can reveal a merchant-configured reward (never shows one that isn't live). */
  gameRewards: flag('VITE_FEATURE_GAME_REWARDS', true),
  /** IYS MOBILE: PJOYS arrives as a small unread marker in the bar (off = no ping, no marker). */
  mobilePjoysNotice: flag('VITE_FEATURE_MOBILE_PJOYS_NOTICE', true),
  /** The "HAVING A HARD TIME?" offer to continue on the real IYS store. */
  escapeRoute: flag('VITE_FEATURE_ESCAPE_ROUTE', true),
} as const;

export type FeatureName = keyof typeof FEATURES;
