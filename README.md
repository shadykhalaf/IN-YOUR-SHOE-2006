# IYS 2000s V2

> **V2 — revised IYS INTERNET 2006 concept**, a standalone project in the
> `v2-iys-retro/` folder of `omarrakram/Concepts`. It has its own
> dependencies, assets, catalogue snapshot, tests and Vercel config, and does
> not depend on any other folder. The original version is kept separately and
> deployed on its own.

**Unofficial speculative digital concept. Not affiliated with In Your Shoe.**
Design & development concept by **Omar Akram, 2026**. CHECKOUT hands the bag (exact variants + quantities) to the official In Your Shoe Shopify checkout, where every order is placed and priced.
Product names, logo and photography belong to their respective rights holders
and are used here for a non-commercial portfolio concept.

> **What if today’s In Your Shoe travelled back to the internet of 2006?**

In Your Shoe did not exist in 2006, and nothing here pretends it did. This is the
**current** brand — its full public catalogue, current FW27 campaign, stores and
official language — loaded into an original, functioning computer from the
mid-2000s. The website *is* the computer; the store runs inside it.

**The visual language is 2006. The engineering is 2026. The brand is current IYS.**

---

## Revision — IYS team feedback (2026-09)

1. **Mobile more retro + blue/green screen vibe.** IYS MOBILE now sits on
   *IYS Hills* (`public/iys/os/hills.svg`), an original vector sky + rolling
   green hills in the cheerful mid-2000s screen mood — no Microsoft/Windows
   asset, name or logo. Glossy sky-blue chrome, grass-green accents, light
   rounded panels.
2. **Less distraction, more CTA.** The 3×3 icon grid and big clock are gone.
   One hero window carries the official line plus **Shop the drop** (green,
   primary → IYS’s Newest collection) and **Explore pjoys xo** (blue,
   secondary), both above the fold. Camera and Messages moved into MENU.
   Product pages show title, price and sizes above the fold; the green centre
   soft key is always the next step (SHOP → PICK SIZE → + MY BAG → CHECKOUT).
3. **Y2K voice.** Concept microcopy uses 2000s slang sparingly (“omg new drop
   just landed :)”, “u + this fit = meant 2 b xx”, “subscribe 2 our newsletter
   xoxo”, “ur bag is empty :(”, “IYS was here XD”). It lives in
   `concept.y2k` in `src/data/copy.ts`, kept apart from verified official IYS
   lines; honesty notes (snapshot prices, no real orders) are kept.
4. **Desktop keeps its OS**, gains the same CTA pair above the FW27 hero, a
   green ADD TO BAG / CHECKOUT, the Y2K copy and an *IYS Hills* wallpaper preset.

## Conversion pass (2026-10)

Continuation of V2 (nothing rebuilt; `/showcase` unchanged frame for frame).
Every capability has its own kill switch in `src/config/features.ts`
(`VITE_FEATURE_*=0` restores the previous behaviour).

| Area | What changed |
| --- | --- |
| Navigation | Desktop top strip: **MENU** (left, opens the one IYS menu) and **MY BAG** (right, live count). |
| IYS MOBILE | SHOP ALL · SEARCH · FAVS · STORES moved into one bar under the status bar, with **MSG** at its end: PJOYS arrives as a small unread marker instead of a popup. The old tiles are gone. |
| Above the fold | JUST DROPPED sits right under the hero and peeks into the first screen (desktop 1024–1920 wide, mobile 320–430). `welcome.htm` can be minimized (remembered for the session). |
| Merchandise | Extra shelves from IYS's own collections (best sellers, hoodies, tees, bottoms, accessories), in stock only, never duplicated. |
| MY BAG | Free-shipping progress from the **verified** announcement (`src/config/promotions.ts`, re-verify by `showUntil`), merchant offers (none configured), GOT A CODE? (passed to Shopify; never claimed valid unless live Shopify says so), and up to 3 complementary in-stock ideas. |
| Search | Egyptian Arabic and Franco-Arabic (هودي, بنطلون, شراب, bantalon, bigama...) mapped to IYS categories, colours and fits, with an "IYS understood" line. English search is unchanged. |
| Size guide | The official chart image from each product page (`npm run sync-size-charts`), 100%/200% zoom; no chart → says so and offers to ask IYS. Coverage: [`docs/SIZE_CHART_COVERAGE.md`](docs/SIZE_CHART_COVERAGE.md). |
| Escape route | After repeated dead ends (404s, failed checkout, empty searches), once per session and only at a calm moment: an offer to continue on the real IYS site with the exact bag. |
| Loading | One loader in the ADD TO BAG language (`src/components/shop/Busy.tsx`). |
| Commerce readiness | Opt-in live Shopify (catalogue, exact cart, code check, free-shipping rule), real-merchant game rewards, hardened IYS MAIL. Off by default; see [`docs/SHOPIFY_GO_LIVE_CHECKLIST.md`](docs/SHOPIFY_GO_LIVE_CHECKLIST.md). |

## Design thesis

- **Build a computer, not a skin.** IYS OS is a real window manager (drag,
  resize, minimise, maximise, focus/z-order, taskbar), with a browser, a
  messenger, a camera, a file explorer, a bag and a control panel.
- **Old interface, new clothes.** Period chrome (glossy title bars, bevels,
  8.3 filenames, status bars, 88×31 badges, one marquee) frames real, current,
  colour-accurate product photography.
- **The brand is the subject.** Identity comes from real products (Pjoys,
  Cairo, Cereal Killer, Touch Grass), real categories and counts, the current
  campaign, the stores and the official lines — not just the logo.
- **2026 UX underneath.** Single-click everything, big touch targets on
  mobile, real form controls, keyboard support, reduced motion, sound off by
  default, no fake loading delays.

A happy discovery during research: IYS’s **current FW27 campaign is staged
with CRT TVs and old computers**. Those real photos are the default wallpaper —
shown as current campaign imagery inside a fictional 2006 machine, never as
archive photos.

## What’s inside

| | |
| --- | --- |
| **Boot** | ~2 s CRT power-on → POST lines → the current IYS wordmark → “TIME TARGET: 2006”. SKIP button, Esc/Enter, once per session, 250 ms fade with reduced motion. |
| **IYS.EXE** | “You’re about to make a Cool Decision!” (official line) with *Cancel* / *Obviously* (concept UI). |
| **Desktop** | Original SVG icon family, FW27 wallpaper, taskbar with IYS menu, quick launch, window buttons, messenger/connection/sound tray and the real device clock (tooltip: “TIME MACHINE TARGET: 2006”). |
| **IYS INTERNET** | Browser with Back/Forward (real history), Refresh, Home, Search, Favorites, Bag, a fake `http://www.inyourshoe.com/...` address that mirrors the real route, a Links bar and a status bar. “View on real IYS site ↗” is the only way out. |
| **Home portal** | Official lines and dated announcements, FW27 hero, **TOP 8 COOL DECISIONS**, NEW STUFF (IYS’s own Newest collection), Pjoys, `C:\IYS\CAIRO\` (القاهرة), IYS × ZED, currently-online buddies, stores, IYS MAIL, a *fictional* TIME TRAVELLERS counter, an honest empty guestbook, original badges. |
| **Shop** | Every public product, 48 per page, « Previous 1 2 3 … N Next », sort, Control-Panel filters (type, size, price, availability, sale), URL-synced state. |
| **Search** | Fuse.js over title/type/collections/tags, typo-tolerant (“ceral” → Cereal Killer). |
| **Product** | IYS IMAGE VIEWER + PRODUCT PROPERTIES: all photos, zoom, full-size viewer, real options and per-variant availability (no silent default size), Qty: [−] 1 [+] feeding ADD TO BAG (same variant again increments), sale only when a real compare-at exists, description (open), the product's own official Care Guide below it (only when IYS publishes one), VIEW CURRENT ITEM ON IYS ↗. |
| **Bag** | “COPYING ITEM TO: MY BAG” < 1 s, quantities, remove, snapshot subtotal in EGP, CHECKOUT → the official IYS checkout via a Shopify cart permalink (`inyourshoe.com/cart/<variant>:<qty>,…`); a line without a real variant stops checkout with an honest message instead of being dropped. |
| **Favorites** | ★ ADD TO FAVORITES, a browser-favorites page, persisted locally. |
| **IYS MESSENGER** | One window: pick a buddy and the conversation opens inside it (tiny “< back 2 buddies” returns to the list). Collections as buddies. **2:13 AM — PJOYS is online: “u awake?” / “enta sa7y?”**, then real Pjoys arrive as file transfers, plus pattern tiles you can set as wallpaper. Scripted concept copy; no bot, no fake customers. |
| **IYS CAMERA** | `E:\DCIM\` — CAMPAIGNS, PJOYS, CAIRO, STORES; 4:3 contact sheet, image viewer, set as wallpaper. |
| **MY WARDROBE** | Explorer over IYS’s own taxonomy; every count comes from data; decorative filenames beside official titles. |
| **Stores** | FIND IYS IRL — every published store with address line, hours, phone, directions. |
| **Control Panel** | Wallpaper (presets, stretch/center/tile), sound, CRT filter, Time Machine (2006 only), System (snapshot facts), About, Reset desktop. |
| **Easter eggs** | README.TXT, RECYCLE BIN (BORING_OUTFITS, empty), `TOUCH_GRASS.EXE` (“ERROR: TOUCH GRASS NOT FOUND.” → the real product), `GAME_NIGHT.EXE`, a screensaver after 60 s idle. |
| **IYS GAMES** | A games folder (desktop icon, IYS menu; on mobile a home-screen launcher + MENU entry) with six original, playable games starring Catchy: **PURBALE CATCHY** (Catchy Closet, Pjoy Pairs, Pack the Drop), **IYS TOWER** (auto-bounce climber through 5 worlds), **CATCHY CHOMP** (3 closet mazes, 4 laundry monsters), **IYS STACKS** (falling blocks, “DROP CLEARED!”), **CATCHY SNAKE** (sock trail + Pjoy bonus) and **CATCHY INVADERS** (5 waves + the LINT KING). Original SVG/Canvas art and synthesized blips only; each game is its own lazy chunk; MY HIGH SCORES stay on this device (`iys2006.games.<id>.highScore`). |
| **CATCHY.EXE** | The real IYS mascot as a desktop buddy: one canonical Catchy drawing (`src/features/catchy/art.ts`, shared with IYS GAMES) with live eyes for blinking and looking, plus the little white paws from the Purbale Catchy art. He lives on the desktop (above the wallpaper, below every window, so windows cover him), sits, wanders, naps, wakes, looks at a nearby cursor without chasing it, can be dragged (or moved with the arrow keys), and reacts to ADD TO BAG (Pjoys / socks / anything), MY BAG, IYS GAMES, wallpaper changes and REAL IYS (a ≤ 280 ms goodbye wave, only when he's visibly on screen; CHECKOUT is never delayed). Short hand-written lines with cooldowns, no AI, nothing sent anywhere. On IYS Mobile he naps on a little ledge of the home screen only. Control Panel › Catchy (or MENU › Settings on mobile) turns him off; stored locally as `iys2006.catchy.enabled` and `iys2006.catchy.position`. |
| **IYS MOBILE** | A separate shell below 700 px on an original sky-and-hills screen: glossy status strip, path titles, a `welcome.htm` hero with **Shop the drop** (primary) + **Explore pjoys xo** (secondary), four shortcuts, a “just dropped” strip, a newsletter panel, list screens, swipe gallery, glossy soft keys (BACK · green context key · BAG), same catalogue/bag/favorites/routes. |

## Technology

React 19 · TypeScript · Vite 8 · React Router 7 · Zustand · react-rnd · GSAP ·
Fuse.js · Vitest · Playwright · axe-core · Sharp · FFmpeg · vite-plugin-pwa ·
Vercel Web Analytics · Playwright/Vitest (`npm test`, `npx playwright test`).
No backend, database, auth, payments, Three.js, Tailwind, UI kit or AI.

```
v2-iys-retro/
  public/
    catalogue/p-00…31.json     full product records (32 on-demand shards)
    iys/{brand,campaign,stores,products,camera,tiles,thumbs,os}/  curated local assets
  src/
    App.tsx                    lazy DesktopShell / MobileShell / Showcase
    shells/                    DesktopShell, MobileShell (+ mobile/ screens, overlays, chrome)
    apps/                      Browser (+ pages), Messenger, Camera, Wardrobe, Viewer, Bag, ControlPanel, Small
    components/os|shop|product Window, Taskbar, StartMenu, Boot, Dialogs, Icon, ProductCard, FilterPanel, Gallery…
    lib/catalogue/             types, hydrate, query (filter/sort/paginate/facets), search (Fuse), shard loader
    state/                     Zustand: os, cart, favorites, preferences(+session), status
    data/                      generated snapshot + copy.ts (official vs concept) + taxonomy + curation
    showcase/                  /showcase film (GSAP master timeline)
    styles/                    tokens, base, controls, os, apps, boot, mobile
    tests/                     Vitest
  scripts/                     sync-products, sync-stores, fetch-showcase-assets, record, frames, qa-screens
  tests/e2e/                   Playwright + axe
  docs/                        SOURCES.md, RESEARCH.md, qa/ (small screenshot set)
```

## Full public catalogue (Egyptian storefront = authority)

The concept contains **every product publicly published on the Egyptian
storefront** at snapshot time — not a curated cast. Counts are never typed by
hand; they are generated into `src/data/catalogue-meta.json`:

| metric (snapshot 2026-09-29) | value |
| --- | --- |
| `publicProductsTotal` | 1,249 |
| `allProductsCollectionCount` (IYS’s own All Products) | 1,224 |
| `productsOutsideAllProducts` | 25 — public collaboration capsules (IYS × ZED, Silver Sands) |
| `variantsTotal` | 4,843 |
| currency / market | EGP / Egypt |

`/shop` (“Shop All”) lists all 1,249 public products and explains the
difference; `/collections/all-products` shows IYS’s own 1,224-item collection
in IYS’s own order. Search covers all 1,249.

**Why Egypt:** the same Shopify store serves Saudi/UAE/Kuwait/UK/international
markets with converted prices and slightly different assortments. The sync uses
only unprefixed Egyptian URLs, sends the store’s own `localization=EG` cookies,
aborts unless the homepage reports `Shopify.currency.active = "EGP"`, rejects
any international-market URL, and cross-checks prices against the product Ajax
endpoint.

### `npm run sync-products`

Manual, never automatic (not on install, not on dev, no bot commits).
Discovery fallback chain, all public and sequential (~4.5 s apart, 429/5xx
retried with Retry-After/backoff):

1. `sitemap.xml` → Egyptian product sitemaps (+ homepage navigation for collections)
2. `/products.json?limit=250&page=N` (paged until empty)
3. `/collections/<handle>/products.json` → membership and IYS’s own order
4. `/products/<handle>.js` for anything still missing
5. JSON-LD in the product page
6. otherwise reported (sitemap entries that 404 are reported as *not public*)

It normalises (never fabricates — unknown = `null`), prints a validation report
(discovered/normalised/unique/duplicates, images, prices, compare-at, variants,
collections, product types, invalid URLs, unparseable, currency mismatches,
international contamination), **fails loudly** on integrity problems or a >20%
shrink, then writes deterministic output and regenerates the catalogue section
of `docs/SOURCES.md`. Raw responses are cached in `.cache/sync/` (gitignored);
`--offline` rebuilds from that cache. `npm run sync-stores` refreshes the store
directory the same way.

### Catalogue architecture (measured)

| file | raw | gzip | loaded |
| --- | --- | --- | --- |
| `src/data/catalogue-index.json` (compact card/filter/search fields) | 589 KB | 114 KB | as its own chunk, in parallel with the boot — never blocks it |
| `public/catalogue/p-XX.json` × 32 (descriptions, care guides, all images, all variants) | 3.0 MB total | 434 KB total | one ~14 KB shard when a product opens |

One flat file would have been ~3.6 MB raw on first load, so the split is
justified by measurement.

### Snapshot notice

Prices, sale states and availability are **as of the sync timestamp** (shown in
the status bar, product pages and Control Panel → System). This is not live
commerce; every product links to the current item on inyourshoe.com.

## Images (hybrid)

- **Full catalogue:** official Shopify CDN URLs, lazy, `decoding="async"`,
  responsive `srcset` using the CDN `width` parameter. If a remote image
  disappears the UI shows “IMAGE COULD NOT LOAD” with the real title (and
  Retry / View original where appropriate) — never a substitute photo.
- **Curated local assets:** `npm run fetch-showcase-assets` downloads only the
  127 images the experience and the film need (logos, FW27 + ZED campaign,
  10 store photos, curated products, camera frames, pattern tiles, 48 showcase
  thumbnails) → Sharp → sRGB WebP (q 78–86), never upscaled, no colour grading
  (~8.4 MB). Every file is logged in `docs/SOURCES.md` with its official URL.
  Digital-camera effects are CSS on campaign/lifestyle frames only.

## Routes

`/` · `/shop` · `/collections/:handle` · `/search?q=` · `/product/:handle`
(`/products/:handle` redirects) · `/favorites` · `/stores` · `/showcase`.
Query state (`page`, `sort`, `type`, `size`, `min`, `max`, `stock`, `sale`, `q`)
survives refresh. Deep links skip the boot and open IYS INTERNET on the exact
product. Closing the browser window returns the address to `/`.

## State & persistence

Zustand stores: `useOS` (windows, focus, dialogs — **never persisted**, so a
broken layout can’t be saved), `useCart` + `useFavorites` + `usePreferences`
(sound, CRT, wallpaper → `localStorage`), `useSession` (boot / welcome / PJOYS
ping → `sessionStorage`). IYS GAMES keep live game state in each game's own
refs (never in a store); only local high scores are written, one integer per
game under `iys2006.games.<id>.highScore`, through the same storage wrapper.

## Desktop vs mobile

Below 700 px the app renders **IYS MOBILE**, a different shell (not a shrunken
desktop). Both shells share catalogue, query/search logic, product/variant
logic, cart, favorites and routes. The mobile chunk never downloads the window
manager (react-rnd) or GSAP. Tablets get the desktop shell with the browser,
wardrobe and camera opening maximised.

## Performance (measured on the production build)

| chunk | gzip | when |
| --- | --- | --- |
| entry (`index-*.js`: React, router, stores, shared UI) | 81.6 KB | always |
| `DesktopShell` + `gsap` + shared app chunk | 19.3 + 26.2 + 9.7 KB | desktop only |
| `MobileShell` | 7.0 KB | mobile only (no react-rnd, no GSAP) |
| `catalogue-index` (all 1,249 products) | 110 KB | in parallel with boot |
| `search` (Fuse.js) | 9.3 KB | first search |
| `Showcase` | 7.4 KB | `/showcase` only |
| one catalogue detail shard | ~14 KB | when a product opens |

Initial JS ≈ 137 KB gz on desktop and ≈ 98 KB on mobile (well under the
400 KB budget); every app window and browser page is a lazy chunk. The shop
never renders more than 48 cards; remote photos are lazy, `decoding="async"`,
and sized through the CDN `width` parameter. No Lighthouse score is claimed
here — none was measured.

## Accessibility

Real buttons/inputs/selects/checkboxes/radios; windows are labelled non-modal
dialogs; system dialogs are modal `alertdialog`s with focus trap and focus
return; Escape closes windows/dialogs/menus; keyboard menus and tabs; context
menu via right-click, Shift+F10 or the menu key; visible dotted focus; skip
link; `prefers-reduced-motion` removes boot animation, flicker, marquee, blink,
window animation and camera flash; sound off by default; 44 px mobile targets.
Automated: axe (WCAG 2.1 A/AA, serious + critical) on the desktop portal, shop,
product, bag/messenger/control-panel windows — 0 violations. This is tested
behaviour, not a certification.

## Testing

```bash
npm test          # Vitest — 58 tests: normalisation, EGP parsing, tags, JSON-LD,
                  # validation, shard hash, stores parser, filters, sort, pagination,
                  # facets, cart, variants, AND the committed snapshot (every product
                  # exactly once across all pages, metrics consistent, curated handles
                  # resolve, search: ceral/cairo/pjoys/hoodie/socks/kids/jeans/black)
npm run test:e2e  # Playwright (builds + previews): 32 tests — boot/skip, window
                  # manager, drag bounds, menu, clock, messenger, touch grass, camera,
                  # wallpaper persistence, wardrobe counts, control panel, shop +
                  # pagination, filters/sort/reset, sale, fuzzy search, deep links
                  # (first/middle/last/kids/women/collab), bag quantities, checkout,
                  # favorites, stores, 404, back/forward, image fallback, 1024 smoke,
                  # mobile shell/shop/product/bag/search/targets, axe
npm run qa:screens  # canonical screenshots → docs/qa/
npm run load:api    # concurrency scenarios for /api/* (in-process, fixture Shopify + mail; nothing external)
npm run load:static -- http://127.0.0.1:4173 --users 100 --seconds 30   # local preview only (refuses other hosts)
```

The conversion pass adds unit suites for Arabic search, bag incentives, upsell,
shelves, escape-route scoring, size-chart data, live-mode client guards and the
server adapters (fixture GraphQL only), plus e2e journeys A–H in
`tests/e2e/v2-conversion*.spec.ts` (store, mail and live APIs are stubbed).

E2E blocks the remote CDN, so tests never depend on IYS being reachable.

## Showcase film — `/showcase`

A deterministic 1080×1920 portrait film (**19.2 s**) built from the site’s own
styles and markup, driven by one paused GSAP master timeline:
boot → FW27 desktop → IYS.EXE → portal + TOP 8 → 2:13 AM PJOYS (“u awake?”, real
Pjoys arrive) → the whole catalogue pages by → search CAIRO → *Cairo Is A
Mindset* hoodie, size M, ADD TO BAG → IYS CAMERA → set the Cereal Killer
balcony photo as wallpaper → MY WARDROBE counts → controlled desktop chaos →
everything minimises → IYS.EXE → end card → power-off.

- `/showcase?t=5.2` seeks and pauses.
- `window.__iysShowcase` = `{ play, pause, seek(t), restart, time(), duration, ready }`.
- Every image is local; the renderer blocks all external requests.

```bash
npm run build && npm run preview   # in one terminal
npm run frames                     # QA stills → out/frames/*.png
npm run record                     # → out/iys-2000s-v2-showcase.mp4 (H.264, 1080×1920, 60 fps)
```

`record` seeks the timeline frame by frame with Playwright (540×960 CSS px at
device scale 2) and pipes PNGs into FFmpeg. The MP4 lives in `out/`
(gitignored) and is never committed.

## PWA

`vite-plugin-pwa` (auto-update, `skipWaiting` + `clientsClaim`, outdated caches
cleaned). Precached: the app shell, JS/CSS, logos, cursors, icons and the two
wallpaper photos. Runtime-cached: catalogue shards (network-first) and local
curated images. **Not cached:** the 1,000+ remote CDN product photos. Offline,
the OS still opens, shows “INTERNET CONNECTION LOST”, and keeps showing
snapshot prices labelled as a snapshot. The installed app is named
“IYS Internet 2006 — Concept”. `sw.js` is served `no-cache`, so new
deployments are picked up on the next visit.

## Analytics

Standard Vercel Web Analytics (`@vercel/analytics`), page views only, no custom
events, no fingerprinting, loaded only in production builds and not on
`localhost`. It is never shown in the UI (the TIME TRAVELLERS counter is
fictional).

## Deploy (Vercel)

Repository `omarrakram/Concepts` · Branch `main` ·
Root Directory `v2-iys-retro` · Framework Vite · Install `npm ci` ·
Build `npm run build` · Output `dist`.
Create this as its own Vercel project; the original version keeps its own
project and deployment.
`vercel.json` rewrites every route to `index.html` (static files first), caches
hashed assets immutably, serves `sw.js` and catalogue shards with revalidation,
and sets `X-Robots-Tag: noindex` (plus `robots.txt`) so this unofficial concept
never competes with inyourshoe.com in search. The normal build needs no network and no secrets.

### Integrations (all in `src/config/integrations.ts`, four separate concerns)

| Concern | Where | Vercel environment variable | If unset |
| --- | --- | --- | --- |
| **IYS MAIL** support email → `orders@inyourshoe.com` | `api/support-email.ts` (server-side, Resend REST API) | `RESEND_API_KEY` (secret), `SUPPORT_FROM_EMAIL` (a Resend-verified sender); `SUPPORT_TO_EMAIL` is honoured only with `SUPPORT_TEST_MODE=1` (subject marked `[TEST]`) | the endpoint answers 503 `not-connected` and IYS MAIL says it is not connected, offering OPEN EMAIL APP (prefilled `mailto:`), never a fake success |
| **Live Shopify** (catalogue, cart, code check, free-shipping rule) | `api/commerce.ts` → `api/_lib/shopify.ts` | server: `COMMERCE_LIVE=1`, `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_STOREFRONT_PRIVATE_TOKEN`, optional `SHOPIFY_ADMIN_TOKEN` (`read_discounts`); build: `VITE_COMMERCE_MODE=live`, `VITE_LIVE_CART=1` | snapshot catalogue + cart permalink (today's behaviour) |
| **IYS GAMES rewards** (real merchant codes only) | `api/rewards.ts` → `api/_lib/rewards.ts` | server: `GAME_REWARDS`, `REWARDS_SECRET`; build: `VITE_GAME_REWARDS=1` | no reward UI at all |
| **IYS NEWSLETTER** signup | `src/lib/newsletter.ts` adapter | `VITE_NEWSLETTER_ENDPOINT` (public URL; POST `{ email }` → `{ ok: true }`) | honest “coming online soon” state; the `IYS10` code is revealed only after a confirmed signup |
| **HELP › IYS Help & Support** (Odoo) | Help window | `VITE_ODOO_HELP_FORM_URL` | intentional “ODOO FORM PLACEHOLDER” |
| **XCHANGE.EXE :) Exchanges / Refunds** (Odoo) | Exchange window | `VITE_ODOO_EXCHANGE_REFUND_FORM_URL` | intentional “Odoo form will load here” placeholder |

The secrets (`RESEND_API_KEY`, the Shopify tokens, `REWARDS_SECRET`) are read only by the server functions.
Step-by-step activation, scopes, validation and rollback: [`docs/SHOPIFY_GO_LIVE_CHECKLIST.md`](docs/SHOPIFY_GO_LIVE_CHECKLIST.md).
`VITE_*` values are public URLs baked into the client at build time. `/api/*`
is excluded from the SPA rewrite and from the service-worker navigation
fallback. Desktop icon positions are stored only in this browser under
`iys2000sv2.desktopIcons`.

## Scripts

| command | does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | type-check + production build |
| `npm run preview` | serve `dist/` |
| `npm test` / `npm run test:e2e` | Vitest / Playwright + axe |
| `npm run sync-products` | re-snapshot the public Egyptian catalogue (network) |
| `npm run sync-stores` | re-read the public store directory (network) |
| `npm run sync-size-charts` | read the official size chart on each product page (network, polite, 7-day cache; `-- --offline` rebuilds from the cache) → `src/data/size-charts.generated.json` + `docs/SIZE_CHART_COVERAGE.md` |
| `npm run fetch-showcase-assets` | download + optimise the curated local images (network) |
| `npm run frames` / `npm run record` | showcase stills / MP4 |
| `npm run qa:screens` | canonical QA screenshots |
| `npm run poster` | 1080×1350 social poster (`out/`) + OpenGraph image (`public/og-poster.jpg`) |
| `node scripts/make-icons.mjs` | regenerate the original PWA icons from `public/favicon.svg` |

## Sources

See [`docs/SOURCES.md`](docs/SOURCES.md) (every page, endpoint and local asset
with its official URL) and [`docs/RESEARCH.md`](docs/RESEARCH.md) (brand and
2004–2007 interface research, Egypt context, design decisions).

## Known limitations

- Snapshot data: prices, sales and stock can change after the sync date.
- Remote product photos depend on the official CDN; offline they show an honest
  placeholder box, not a substitute image.
- Tahoma/Verdana are used when installed; elsewhere the stack falls back to
  DejaVu/Arial (no fonts are bundled).
- The fake address bar accepts `inyourshoe.com` paths and search terms; it never
  navigates away from the concept.
- Messenger conversations are fixed concept scripts (by design, no AI).
- The official “Same day delivery” / “Free shipping over 3999 EGP” lines were
  read on inyourshoe.com on 2026-10-26 (it was +2,499 before); MY BAG stops
  showing the free-shipping progress after `showUntil` until someone re-verifies.
- The newsletter's `IYS10` code is only revealed after a confirmed signup, and
  no signup endpoint is connected; IYS should confirm the code before connecting one.
- Rate limits on `/api/*` are per warm serverless instance (see the go-live checklist).
