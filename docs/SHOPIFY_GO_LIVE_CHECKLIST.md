# IYS Retro: going live with Shopify, rewards and IYS MAIL

This concept works fully **without any credentials**: it runs on the public
catalogue snapshot, hands the bag to the real IYS Shopify checkout through a
cart permalink, and never claims anything Shopify hasn't confirmed.

Everything below is **optional, server-side and off by default**. Each piece
has its own switch, can be enabled on its own, and falls back to snapshot
behaviour if it fails. No token is ever shipped to the browser.

## 1. Readiness at a glance

| Capability | Works today (no credentials) | Needs from IYS | Switches |
| --- | --- | --- | --- |
| Catalogue | Snapshot (`npm run sync-products`, redeploy) | Storefront API token | `COMMERCE_LIVE=1` (server) + `VITE_COMMERCE_MODE=live` (build) |
| Checkout | Cart permalink → real IYS checkout | Storefront API token (cart scope) | the above + `VITE_LIVE_CART=1` |
| Discount code check in MY BAG | Code is passed to Shopify; UI says "IYS checks it at checkout" | Storefront API token | `VITE_COMMERCE_MODE=live` |
| Free-shipping progress | From the verified announcement in `src/config/promotions.ts` (re-verify by `showUntil`) | optional: Admin API `read_discounts` | `SHOPIFY_ADMIN_TOKEN` |
| Bag offers | None shown (`OFFERS = []`) | the real offer wording + dates | edit `src/config/promotions.ts` |
| Game rewards | Off; games look exactly as before | existing Shopify discount codes + written approval | `GAME_REWARDS`, `REWARDS_SECRET`, `VITE_GAME_REWARDS=1` |
| IYS MAIL | Honest "not connected yet" + OPEN EMAIL APP fallback | Resend account + verified sender domain | `RESEND_API_KEY`, `SUPPORT_FROM_EMAIL` |
| Size charts | Official charts synced from inyourshoe.com product pages | nothing (see `docs/SIZE_CHART_COVERAGE.md` for gaps) | `node scripts/sync-size-charts.mjs` |

## 2. What IYS needs to provide

1. **Store domain**: the `*.myshopify.com` domain (or the primary domain).
2. **Storefront API private token**: from the *Headless* sales channel (or a
   custom app with Storefront access). Scopes:
   - `unauthenticated_read_product_listings`
   - `unauthenticated_read_product_tags`
   - `unauthenticated_read_collection_listings`
   - `unauthenticated_write_checkouts` and `unauthenticated_read_checkouts` (cart)
3. **Admin API access token** (optional, custom app). Scope: **`read_discounts` only**.
   It is used to read active free-shipping discounts and confirm that reward
   codes are ACTIVE. No write scope is requested or needed.
4. **Game rewards** (optional): which *existing* Shopify discount codes may be
   given for which game and score, with written approval. Recommended: a
   dedicated campaign code with Shopify-side limits (dates, total uses, once
   per customer, minimum purchase, no combining).
5. **IYS MAIL**: a Resend account, a verified sending domain, and the sender
   address (for example `IYS Mail <mail@yourdomain>`). Mail always goes to
   `orders@inyourshoe.com`.

## 3. Environment variables (Vercel → Project → Settings → Environment Variables)

Server-only (never prefixed with `VITE_`, never visible in the browser):

| Variable | Purpose |
| --- | --- |
| `COMMERCE_LIVE` | `1` turns the live Shopify boundary on (nothing live without it) |
| `SHOPIFY_STORE_DOMAIN` | e.g. `in-your-shoe.myshopify.com` |
| `SHOPIFY_STOREFRONT_PRIVATE_TOKEN` | preferred; or `SHOPIFY_STOREFRONT_PUBLIC_TOKEN` |
| `SHOPIFY_ADMIN_TOKEN` | optional, `read_discounts` only |
| `SHOPIFY_API_VERSION` | optional, default `2026-07` |
| `GAME_REWARDS` | JSON list, see §6 |
| `REWARDS_SECRET` | random string, 32+ characters (signs play tickets) |
| `RESEND_API_KEY` | IYS MAIL provider key |
| `SUPPORT_FROM_EMAIL` | verified sender |
| `SUPPORT_TEST_MODE` + `SUPPORT_TO_EMAIL` | test deployments only, see §7 |

Build-time, public (they only say *which* features to try; they hold no secret):

| Variable | Purpose |
| --- | --- |
| `VITE_COMMERCE_MODE=live` | client tries `/api/commerce` for catalogue + code checks |
| `VITE_LIVE_CART=1` | checkout builds a real Shopify cart first (permalink stays the fallback) |
| `VITE_GAME_REWARDS=1` | games ask `/api/rewards` what is really redeemable |
| `VITE_FEATURE_*` | kill switches for each conversion feature (`src/config/features.ts`) |

## 4. Turning it on, step by step (Preview deployment first)

1. Add the server variables to the **Preview** environment only.
2. Open `/api/commerce?op=status`. Expect `"live": true, "storefront": true`.
   It shows booleans and a `problems` list, never a token.
3. Open `/api/commerce?op=catalogue&part=index`. Expect JSON with `"currency":"EGP"`
   and a product count close to the snapshot's. A non-EGP price or a duplicate
   handle makes the server refuse the live catalogue (502), and the site stays
   on the snapshot.
4. Set `VITE_COMMERCE_MODE=live`, redeploy the preview, browse a product page,
   and confirm prices and sizes match inyourshoe.com.
5. Cart check without buying anything: set `VITE_LIVE_CART=1`, redeploy, add one
   item, press CHECKOUT and stop on Shopify's checkout page. `cartCreate`
   creates a cart, **not an order**. Never complete payment for a test.
6. If an Admin token is set: `/api/commerce?op=promotions` shows the active
   free-shipping minimum (or `null`). `null` does **not** mean there is no free
   shipping: it can also be a shipping-rate rule. Then the verified rule in
   `src/config/promotions.ts` stays in use.
7. Only after IYS approves the preview: copy the same variables to Production.

## 5. Rollback

Remove `VITE_COMMERCE_MODE` / `VITE_LIVE_CART` / `VITE_GAME_REWARDS` and redeploy,
or set `COMMERCE_LIVE=0` (no redeploy of the client needed: the API answers
`503 not-configured` and the client falls back to the snapshot). The bundled
snapshot is always in the build, so a rollback never leaves an empty shop.

## 6. Game rewards (real merchant codes only)

```json
[
  {
    "id": "snake-500",
    "game": "snake",
    "minScore": 500,
    "requiresWin": false,
    "code": "<AN EXISTING SHOPIFY CODE IYS APPROVED>",
    "label": "10% OFF",
    "description": "on ur next IYS order",
    "conditions": "Once per customer. Ends 30 Nov.",
    "minPlaySeconds": 45,
    "merchantConfirmedUntil": "2026-11-30"
  }
]
```

- `game` is one of `snake`, `stacks`, `chomp`, `tower`, `invaders`,
  `purbale-closet`, `purbale-pairs`, `purbale-pack`.
- With an Admin token, a reward is offered **only while Shopify says the code is
  ACTIVE** (checked every 5 minutes). Without one, only until
  `merchantConfirmedUntil`. Neither → the reward is never shown.
- The list endpoint never returns codes. A code is returned only by a claim
  with a signed play ticket, after `minPlaySeconds`, for a score that meets the
  rule, once per run, max 5 claims per 10 minutes per visitor.
- **Honest limit:** games run in the browser, so a determined player can fake a
  score. That is why rewards must be generic campaign codes whose real limits
  are enforced by Shopify. No endpoint creates codes. Unique single-use codes
  would need `write_discounts` plus real customer authentication; this is
  intentionally **not** built.

## 7. IYS MAIL

**Why it never sent before (fixed 2026-10-26):** the project is an ES module
package, and Vercel compiles each `api/*.ts` file on its own, keeping import
paths as written. Node refuses extensionless relative imports in ES modules,
so `/api/support-email` (and `/api/commerce`, `/api/rewards`) crashed on load
with `ERR_MODULE_NOT_FOUND` → Vercel answered `500 FUNCTION_INVOCATION_FAILED`
(plain text) → the form showed "Could not reach the mail server". Every
relative import under `api/` now names its `.js` file, and a unit test keeps it
that way. Reproduced and verified with the real Vercel CLI (`vercel build`, then
loading each compiled function).

**Check a deployment in the browser:** open `https://<deployment>/api/support-email?status`.
It answers `{"configured": true|false, "missing": [...], "deliversTo": "orders@inyourshoe.com"}`
and never shows a secret. `configured: false` means the variables below are not
set **for that Vercel project and that environment**. Preview and Production
have separate values: tick *Preview* as well as *Production* when adding them,
then redeploy. Several Vercel projects build `v2-iys-retro` from this repo;
set them on the project whose URL you actually test.

- With `RESEND_API_KEY` + `SUPPORT_FROM_EMAIL` set, IYS MAIL sends a real email
  to `orders@inyourshoe.com`, Reply-To the customer, and shows MAIL SENT only
  after Resend accepts it.
- Without them, the form says IYS MAIL is not connected and offers
  OPEN EMAIL APP (a prefilled `mailto:`), which is never presented as sent.
- One idempotency key per draft: a double click or a retry after a lost
  response can't send the same message twice.
- Max 5 sends per 10 minutes per visitor; a honeypot field drops bots.
- **Testing without emailing IYS:** on a preview deployment set
  `SUPPORT_TEST_MODE=1` and `SUPPORT_TO_EMAIL=<your test inbox>`. Messages go
  there with `[TEST]` in the subject. Outside test mode `SUPPORT_TO_EMAIL` is
  ignored, so production mail can never be silently redirected.

## 8. Limits to know about

- Rate limits are in-memory **per warm serverless instance**. They stop one
  visitor hammering an endpoint, not a distributed attack. For hard limits add
  a Vercel Firewall rate-limit rule on `/api/*`.
- The live catalogue is built from roughly 25 product pages plus one query per
  collection (4 at a time), cached 10 minutes per instance and at the CDN
  (`s-maxage=600`). `vercel.json` gives `api/commerce.ts` up to 60 s. If a build
  is slow, the client waits at most 6 s and then uses the snapshot.
- The snapshot can drift from the live store (prices, stock, removed products).
  Re-run `npm run sync-products` and redeploy, or enable live mode.
