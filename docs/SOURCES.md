# Sources — IYS INTERNET 2006

Every fact, product, price, photograph and logo in this unofficial concept comes from
In Your Shoe's **public** website. No private, internal, unpublished or logged-in
material is used. Nothing was invented to fill gaps: missing fields stay empty.

<!-- catalogue:start -->
### Catalogue snapshot

| field | value |
| --- | --- |
| storefront | https://inyourshoe.com (Egyptian storefront — authoritative) |
| market / currency | Egypt / EGP |
| synced at | 2026-09-30T22:38:01.482Z |
| public products (total) | 1,249 |
| in IYS “All Products” collection | 1,224 |
| public but outside All Products | 25 (black-zed-stars-sworts, black-zed-stars-wide-leg-swants, blue-future-stars-towel, breaking-brgr-hoodie, christmas-joy-fluffy-blanket, distorted-youth-dept-jersey, …) |
| variants | 4,843 |
| listed in sitemap but not public (404) | hot-wheels-pjoys |
| source methods used | sitemap.xml, products.json, collection products.json |

**Endpoints (public, read-only, sequential, ~4.5 s apart, 429/5xx retried with Retry-After/backoff):**

- https://inyourshoe.com/sitemap.xml → unprefixed (Egyptian) product sitemaps only
- https://inyourshoe.com/products.json?limit=250&page=N
- https://inyourshoe.com/collections.json?limit=250 (collection titles)
- https://inyourshoe.com/collections/<handle>/products.json — membership + order for 67 collections: all-products, newest, pjoys, fluffy-pjoys, kids-pjoys, kids-fluffy-pjoys, cairo, cereal-killer, women, men, unisex, all-kids-products, all-accessories, all-tops, all-bottoms, homewear, on-sale, best-sellers, hoodies, outwear, all-socks, hats-caps, bandanas, headbands, all-bags, inyourshoexzed, stripes, kids, neck-socks, fluffy-socks, caps, long-sleeves-and-polos, crewnecks, jackets-sweaters, t-shirts, jerseys, shirts, tops-vests, pants, jeans, sweatpants, shorts, boxer-pants, skirts, leggings, swimmies, denims, linens, the-vacation-edit, knitwear, sportswear, pshorts, pshirts, pantoufles, boxer-shorts, flowy-wraps, beach-towels, others, baby-tees-jerseys, shirts-polos, pants-jeans, shorts-jorts, all-dresses, womens-sets, bags-for-her, bundles, end-of-season-sale
- https://inyourshoe.com/products/<handle>.js — fallback, and a 5-product EGP price cross-check
- https://inyourshoe.com/products/<handle> JSON-LD — last-resort fallback
- https://inyourshoe.com/products/<handle>?section_id=<product section> — each product’s official care guide (the theme’s `care-guide` block); 1,175 products publish one, 74 publish none (stored as `null`, never inferred); a sample of full product pages is cross-checked
- https://inyourshoe.com/pages/store-locations — store directory (`npm run sync-stores`)

Every request sends the storefront’s own `localization=EG; cart_currency=EGP` cookies; the sync aborts unless the homepage reports `Shopify.currency.active = "EGP"`, and fails on duplicate handles, currency mismatches, international-market URLs, missing prices/images, or a >20% catalogue shrink.
<!-- catalogue:end -->

## Pages researched (public, 2026-09-29)

| page | used for |
| --- | --- |
| https://inyourshoe.com/ | Egyptian market check (`Shopify.currency`), header navigation (which collections IYS surfaces), official lines, brand-kit colours, current logos, FW27 + IYS × ZED homepage banners, announcement bar |
| https://inyourshoe.com/sitemap.xml and its Egyptian product/collection/page sitemaps | discovery of every public product handle and collection |
| https://inyourshoe.com/collections/all-products | IYS’s own All Products membership (1,224 at snapshot) |
| https://inyourshoe.com/collections/newest | “NEW STUFF” and the *Newest* sort (IYS’s own order) |
| https://inyourshoe.com/collections/pjoys, /fluffy-pjoys | Pjoys counts and the Pjoy moment |
| https://inyourshoe.com/collections/cairo | the C:\IYS\CAIRO\ folder |
| https://inyourshoe.com/pages/store-locations | store names, address lines, opening hours, phone numbers, Maps links, store photos |
| product pages (e.g. /products/cereal-killer-pjoys) | descriptions, the Pjoys definition line, spot-checks of price/variants/availability |

## Official copy used (verified 2026-09-29)

All official strings live in `src/data/copy.ts → official`; everything in
`concept` is new copy for this unofficial concept and is never presented as IYS copy.

| line | where it appears on inyourshoe.com |
| --- | --- |
| You’re about to make a Cool Decision! | scrolling marquee + footer |
| The Coolest Apparel In Town! | homepage `<title>` |
| Stand out, Express yourself! We put ourselves in your shoe, in style! :) | homepage meta description |
| Join our cool list and receive a 10% OFF code for your 1st purchase! | footer newsletter block (no code is shown or invented) |
| Same-day delivery available ⚡ | announcement bar (dated in the UI; volatile) |
| Free Shipping +2,499 | announcement bar (dated in the UI; volatile) |
| Pjoys are our terminology for pyjama pants that are super joyful, just like you reading this. | Pjoys product descriptions |

## What is NOT used

No reviews, star ratings or customer names (the guestbook says “no entries
yet”), no private stock data (the public `Online Out of Stock` tag is
ignored — availability comes only from public variant data), no internal
systems, no discount codes, no generated or retouched product photography.
The “TIME TRAVELLERS” counter is labelled fictional and is not analytics.

**IYS Hills** (`public/iys/os/hills.svg`, the mobile home screen, splash and
home CTA band) is an original vector landscape drawn for this concept. It
evokes the cheerful blue-sky / green-hills screen mood of the mid-2000s; it is
not a copy or trace of any operating-system wallpaper, and no Microsoft /
Windows name, logo or asset is used. Y2K slang lines (“omg new drop just
landed :)”, “Subscribe xo”…) are CONCEPT COPY in `src/data/copy.ts`
(`concept.y2k`), never presented as IYS language.

**Purbale Catchy** (`public/iys/os/purbale-catchy.webp`, 1672×940, a Control
Panel wallpaper preset) is artwork supplied by the project owner for this
concept and is committed byte-for-byte unchanged (no crop, recolour or
re-encode).

## Local assets

<!-- assets:start -->
Retrieved 2026-09-29 by `npm run fetch-showcase-assets` (the 4 renamed-product files on 2026-09-30). 127 files.

| local file | official source URL | type | subject | retrieved |
| --- | --- | --- | --- | --- |
| `public/iys/brand/iys-mark.svg` | https://inyourshoe.com/cdn/shop/files/IYS_LOGO.svg | logo | IYS mark (current, homepage header) | 2026-09-29 |
| `public/iys/brand/iys-mark-white.svg` | https://inyourshoe.com/cdn/shop/files/IYS_LOGO.svg | logo (white fill variant) | IYS mark — fill #000→#FFF, geometry untouched | 2026-09-29 |
| `public/iys/brand/in-your-shoe-white.png` | https://inyourshoe.com/cdn/shop/files/INYOURSHOE-LOGO-WHITE.png | logo | IN YOUR SHOE wordmark, white (current header logo) | 2026-09-29 |
| `public/iys/brand/in-your-shoe-black.png` | https://inyourshoe.com/cdn/shop/files/Name_PNG_aa2488c8-8e3c-4a35-bd7f-8e36f9e671ea.png | logo | IN YOUR SHOE wordmark, black (current) | 2026-09-29 |
| `public/iys/campaign/fw27-1.webp` | https://inyourshoe.com/cdn/shop/files/FW27-DESKTOP-01_jpg.jpg | campaign | FW27 campaign — desktop banner 1 | 2026-09-29 |
| `public/iys/campaign/fw27-2.webp` | https://inyourshoe.com/cdn/shop/files/FW27-DESKTOP-02_jpg.jpg | campaign | FW27 campaign — desktop banner 2 | 2026-09-29 |
| `public/iys/campaign/fw27-m1.webp` | https://inyourshoe.com/cdn/shop/files/FW27-MOBILE-01_jpg.jpg | campaign | FW27 campaign — mobile banner 1 | 2026-09-29 |
| `public/iys/campaign/fw27-m2.webp` | https://inyourshoe.com/cdn/shop/files/FW27-MOBILE-02_jpg.jpg | campaign | FW27 campaign — mobile banner 2 | 2026-09-29 |
| `public/iys/campaign/zed-1.webp` | https://inyourshoe.com/cdn/shop/files/DESKTOP-SLIDER-UPDATED-ZED_jpg.jpg | campaign | IYS × ZED — desktop banner | 2026-09-29 |
| `public/iys/campaign/zed-m1.webp` | https://inyourshoe.com/cdn/shop/files/MOBILE-SLIDER-UPDATED-ZED_jpg.jpg | campaign | IYS × ZED — mobile banner | 2026-09-29 |
| `public/iys/stores/city-stars.webp` | https://inyourshoe.com/cdn/shop/files/WhatsApp_Image_2025-12-23_at_22.20.50.jpg | store photo | CITY STARS | 2026-09-29 |
| `public/iys/stores/u-venues.webp` | https://inyourshoe.com/cdn/shop/files/Screenshot_from_2025-11-30_12-53-03.png | store photo | U VENUES | 2026-09-29 |
| `public/iys/stores/city-centre-almazah-mall.webp` | https://inyourshoe.com/cdn/shop/files/PHOTO-2023-12-07-15-25-34_85844759-b2a6-4aa5-b36e-9afd3d87f760.jpg | store photo | City Centre Almazah Mall | 2026-09-29 |
| `public/iys/stores/district-5.webp` | https://inyourshoe.com/cdn/shop/files/WhatsApp_Image_2025-09-21_at_06.24.15.jpg | store photo | District 5 | 2026-09-29 |
| `public/iys/stores/open-air-mall.webp` | https://inyourshoe.com/cdn/shop/files/1000141396.jpg | store photo | OPEN AIR MALL | 2026-09-29 |
| `public/iys/stores/mall-of-egypt.webp` | https://inyourshoe.com/cdn/shop/files/IMG_6789.heic | store photo | Mall of Egypt | 2026-09-29 |
| `public/iys/stores/the-yard-mall.webp` | https://inyourshoe.com/cdn/shop/files/yard_1.jpg | store photo | The Yard Mall | 2026-09-29 |
| `public/iys/stores/city-centre-alexandria-mall.webp` | https://inyourshoe.com/cdn/shop/files/CITY_ALEX_bc620aad-7802-402b-8e74-1db44ecdc1d2.jpg | store photo | City Centre Alexandria Mall | 2026-09-29 |
| `public/iys/stores/el-gouna.webp` | https://inyourshoe.com/cdn/shop/files/98dcb071-e53a-49a1-b01f-59570bad4639_7287938e-67c1-4381-afdf-9d616098c153.jpg | store photo | El-Gouna | 2026-09-29 |
| `public/iys/stores/the-wing-outlet.webp` | https://inyourshoe.com/cdn/shop/files/PHOTO-2024-03-07-17-14-21_a9f54e37-4cf0-48f2-bb83-3eef0465bd17.jpg | store photo | The Wing Outlet | 2026-09-29 |
| `public/iys/products/dropout-oversized-hoodie-1.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/dropout-oversized-hoodie-printed-hoodies-in-your-shoe-209981.jpg | product image | Dropout Oversized Hoodie | 2026-09-29 |
| `public/iys/products/dropout-oversized-hoodie-2.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/dropout-oversized-hoodie-printed-hoodies-in-your-shoe-217302.jpg | product image | Dropout Oversized Hoodie | 2026-09-29 |
| `public/iys/products/cereal-killer-fluffy-pjoys-1.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/cereal-killer-fluffy-pjoys-fluffy-pjoys-in-your-shoe-937572.jpg | product image | Cereal Killer Fluffy Pjoys | 2026-09-29 |
| `public/iys/products/cereal-killer-fluffy-pjoys-2.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/cereal-killer-fluffy-pjoys-fluffy-pjoys-in-your-shoe-943655.jpg | product image | Cereal Killer Fluffy Pjoys | 2026-09-29 |
| `public/iys/products/egyptian-culture-oversized-long-sleeves-1.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/egyptian-culture-oversized-long-sleeves-long-sleeves-in-your-shoe-282745.jpg | product image | Egyptian Culture Oversized Long Sleeves | 2026-09-29 |
| `public/iys/products/egyptian-culture-oversized-long-sleeves-2.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/egyptian-culture-oversized-long-sleeves-long-sleeves-in-your-shoe-278377.jpg | product image | Egyptian Culture Oversized Long Sleeves | 2026-09-29 |
| `public/iys/products/female-denim-blue-washed-wide-leg-jeans-1.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/female-denim-blue-washed-wide-leg-jeans-jeans-in-your-shoe-101686.jpg | product image | Female Denim Blue Washed Wide Leg Jeans | 2026-09-29 |
| `public/iys/products/female-denim-blue-washed-wide-leg-jeans-2.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/female-denim-blue-washed-wide-leg-jeans-jeans-in-your-shoe-430045.jpg | product image | Female Denim Blue Washed Wide Leg Jeans | 2026-09-29 |
| `public/iys/products/kairo-pop-jersey-1.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/kairo-pop-jersey-jersey-in-your-shoe-124269.jpg | product image | Kairo Pop Jersey | 2026-09-29 |
| `public/iys/products/kairo-pop-jersey-2.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/kairo-pop-jersey-jersey-in-your-shoe-127870.jpg | product image | Kairo Pop Jersey | 2026-09-29 |
| `public/iys/products/mustard-guarded-boxy-zip-up-hoodie-1.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/mustard-afterclass-boxy-zip-up-hoodie-zip-up-hoodies-in-your-shoe-160129.jpg | product image | Mustard Guarded Boxy Zip-Up Hoodie | 2026-09-30 |
| `public/iys/products/mustard-guarded-boxy-zip-up-hoodie-2.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/mustard-afterclass-boxy-zip-up-hoodie-zip-up-hoodies-in-your-shoe-207971.jpg | product image | Mustard Guarded Boxy Zip-Up Hoodie | 2026-09-30 |
| `public/iys/products/sunset-stripes-fluffy-pjoys-1.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/sunset-stripes-fluffy-pjoys-fluffy-pjoys-in-your-shoe-750530.jpg | product image | Sunset Stripes Fluffy Pjoys | 2026-09-29 |
| `public/iys/products/sunset-stripes-fluffy-pjoys-2.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/sunset-stripes-fluffy-pjoys-fluffy-pjoys-in-your-shoe-600684.jpg | product image | Sunset Stripes Fluffy Pjoys | 2026-09-29 |
| `public/iys/products/blue-checkered-laptop-sleeve-1.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/blue-checkered-laptop-sleeve-laptop-sleeve-in-your-shoe-715670.jpg | product image | Blue Checkered Laptop Sleeve | 2026-09-29 |
| `public/iys/products/blue-checkered-laptop-sleeve-2.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/blue-checkered-laptop-sleeve-laptop-sleeve-in-your-shoe-578753.jpg | product image | Blue Checkered Laptop Sleeve | 2026-09-29 |
| `public/iys/products/cereal-killer-pjoys-1.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/cereal-killer-pjoys-pjoys-in-your-shoe-901214.jpg | product image | Cereal Killer Pjoys | 2026-09-29 |
| `public/iys/products/cereal-killer-pjoys-2.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/cereal-killer-pjoys-pjoys-in-your-shoe-683352.jpg | product image | Cereal Killer Pjoys | 2026-09-29 |
| `public/iys/products/love-you-so-matcha-pjoys-1.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/love-you-so-matcha-pjoys-pjoys-in-your-shoe-148812.jpg | product image | Love You So Matcha Pjoys | 2026-09-29 |
| `public/iys/products/love-you-so-matcha-pjoys-2.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/love-you-so-matcha-pjoys-pjoys-in-your-shoe-845552.jpg | product image | Love You So Matcha Pjoys | 2026-09-29 |
| `public/iys/products/not-your-habibi-pjoys-1.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/not-your-habibi-pjoys-pjoys-in-your-shoe-998920.jpg | product image | Not Your Habibi Pjoys | 2026-09-29 |
| `public/iys/products/not-your-habibi-pjoys-2.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/not-your-habibi-pjoys-pjoys-in-your-shoe-885757.jpg | product image | Not Your Habibi Pjoys | 2026-09-29 |
| `public/iys/products/game-night-pjoys-1.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/game-night-pjoys-pjoys-in-your-shoe-868530.jpg | product image | Game Night Pjoys | 2026-09-29 |
| `public/iys/products/game-night-pjoys-2.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/game-night-pjoys-pjoys-in-your-shoe-209765.jpg | product image | Game Night Pjoys | 2026-09-29 |
| `public/iys/products/touch-grass-pjoys-1.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/touch-grass-pjoys-pjoys-in-your-shoe-742415.jpg | product image | Touch Grass Pjoys | 2026-09-29 |
| `public/iys/products/touch-grass-pjoys-2.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/touch-grass-pjoys-pjoys-in-your-shoe-854001.jpg | product image | Touch Grass Pjoys | 2026-09-29 |
| `public/iys/products/main-character-pjoys-1.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/main-character-pjoys-pjoys-in-your-shoe-765906.jpg | product image | Main Character Pjoys | 2026-09-29 |
| `public/iys/products/main-character-pjoys-2.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/main-character-pjoys-pjoys-in-your-shoe-925694.jpg | product image | Main Character Pjoys | 2026-09-29 |
| `public/iys/products/cairo-desert-pjoys-1.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/cairo-desert-pjoys-pjoys-in-your-shoe-208161.jpg | product image | Cairo Desert Pjoys | 2026-09-29 |
| `public/iys/products/cairo-desert-pjoys-2.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/cairo-desert-pjoys-pjoys-in-your-shoe-967817.jpg | product image | Cairo Desert Pjoys | 2026-09-29 |
| `public/iys/products/dont-go-out-fluffy-pjoys-1.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/dont-go-out-fluffy-pjoys-fluffy-pjoys-in-your-shoe-560177.jpg | product image | Don't Go Out Fluffy Pjoys | 2026-09-29 |
| `public/iys/products/dont-go-out-fluffy-pjoys-2.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/dont-go-out-fluffy-pjoys-fluffy-pjoys-in-your-shoe-693605.jpg | product image | Don't Go Out Fluffy Pjoys | 2026-09-29 |
| `public/iys/products/cairo-is-a-mindset-oversized-hoodie-1.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/cairo-is-a-mindset-oversized-hoodie-printed-hoodies-in-your-shoe-798730.jpg | product image | Cairo Is A Mindset Oversized Hoodie | 2026-09-29 |
| `public/iys/products/cairo-is-a-mindset-oversized-hoodie-2.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/cairo-is-a-mindset-oversized-hoodie-printed-hoodies-in-your-shoe-959651.jpg | product image | Cairo Is A Mindset Oversized Hoodie | 2026-09-29 |
| `public/iys/products/universal-cairo-club-double-sleeve-tee-1.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/universal-cairo-club-double-sleeve-tee-double-sleeve-tee-in-your-shoe-703793.jpg | product image | Universal Cairo Club Double Long Sleeves | 2026-09-29 |
| `public/iys/products/universal-cairo-club-double-sleeve-tee-2.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/universal-cairo-club-double-sleeve-tee-double-sleeve-tee-in-your-shoe-294501.jpg | product image | Universal Cairo Club Double Long Sleeves | 2026-09-29 |
| `public/iys/products/qasr-el-nile-regular-tee-1.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/qasr-el-nile-regular-tee-printed-regular-tees-in-your-shoe-585613.jpg | product image | Qasr El Nile Regular Tee | 2026-09-29 |
| `public/iys/products/qasr-el-nile-regular-tee-2.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/qasr-el-nile-regular-tee-printed-regular-tees-in-your-shoe-567565.jpg | product image | Qasr El Nile Regular Tee | 2026-09-29 |
| `public/iys/products/heliopolis-regular-tee-1.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/heliopolis-regular-tee-printed-regular-tees-in-your-shoe-396171.jpg | product image | Heliopolis Regular Tee | 2026-09-29 |
| `public/iys/products/heliopolis-regular-tee-2.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/heliopolis-regular-tee-printed-regular-tees-in-your-shoe-457785.jpg | product image | Heliopolis Regular Tee | 2026-09-29 |
| `public/iys/products/masr-washed-cap-1.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/masr-washed-cap-washed-cap-in-your-shoe-699948.jpg | product image | Masr Washed Cap | 2026-09-29 |
| `public/iys/products/masr-washed-cap-2.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/masr-washed-cap-washed-cap-in-your-shoe-729994.jpg | product image | Masr Washed Cap | 2026-09-29 |
| `public/iys/products/i-love-cairo-neck-socks-1.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/i-love-cairo-neck-socks-neck-socks-in-your-shoe-316817.jpg | product image | I Love Cairo Neck Socks | 2026-09-29 |
| `public/iys/products/i-love-cairo-neck-socks-2.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/i-love-cairo-neck-socks-neck-socks-in-your-shoe-974684.jpg | product image | I Love Cairo Neck Socks | 2026-09-29 |
| `public/iys/camera/pjoys-01.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/cereal-killer-pjoys-pjoys-in-your-shoe-683352.jpg | product lifestyle photo | Cereal Killer Pjoys | 2026-09-29 |
| `public/iys/camera/pjoys-02.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/cereal-killer-pjoys-pjoys-in-your-shoe-901214.jpg | product lifestyle photo | Cereal Killer Pjoys | 2026-09-29 |
| `public/iys/camera/pjoys-03.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/love-you-so-matcha-pjoys-pjoys-in-your-shoe-845552.jpg | product lifestyle photo | Love You So Matcha Pjoys | 2026-09-29 |
| `public/iys/camera/pjoys-04.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/dont-go-out-fluffy-pjoys-fluffy-pjoys-in-your-shoe-693605.jpg | product lifestyle photo | Don't Go Out Fluffy Pjoys | 2026-09-29 |
| `public/iys/camera/pjoys-05.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/cereal-killer-pjoys-pjoys-in-your-shoe-712347.jpg | product lifestyle photo | Cereal Killer Pjoys | 2026-09-29 |
| `public/iys/camera/pjoys-06.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/game-night-pjoys-pjoys-in-your-shoe-868530.jpg | product lifestyle photo | Game Night Pjoys | 2026-09-29 |
| `public/iys/camera/cairo-07.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/cairo-is-a-mindset-oversized-hoodie-printed-hoodies-in-your-shoe-798730.jpg | product lifestyle photo | Cairo Is A Mindset Oversized Hoodie | 2026-09-29 |
| `public/iys/camera/cairo-08.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/cairo-is-a-mindset-oversized-hoodie-printed-hoodies-in-your-shoe-667690.jpg | product lifestyle photo | Cairo Is A Mindset Oversized Hoodie | 2026-09-29 |
| `public/iys/camera/cairo-09.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/kairo-pop-jersey-jersey-in-your-shoe-124269.jpg | product lifestyle photo | Kairo Pop Jersey | 2026-09-29 |
| `public/iys/camera/cairo-10.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/universal-cairo-club-double-sleeve-tee-double-sleeve-tee-in-your-shoe-703793.jpg | product lifestyle photo | Universal Cairo Club Double Long Sleeves | 2026-09-29 |
| `public/iys/camera/cairo-11.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/egyptian-culture-oversized-long-sleeves-long-sleeves-in-your-shoe-282745.jpg | product lifestyle photo | Egyptian Culture Oversized Long Sleeves | 2026-09-29 |
| `public/iys/camera/cairo-12.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/qasr-el-nile-regular-tee-printed-regular-tees-in-your-shoe-585613.jpg | product lifestyle photo | Qasr El Nile Regular Tee | 2026-09-29 |
| `public/iys/tiles/cereal-killer-pjoys.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/cereal-killer-pjoys-pjoys-in-your-shoe-201261.jpg | product detail photo (pattern) | Cereal Killer Pjoys | 2026-09-29 |
| `public/iys/tiles/love-you-so-matcha-pjoys.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/love-you-so-matcha-pjoys-pjoys-in-your-shoe-325392.jpg | product detail photo (pattern) | Love You So Matcha Pjoys | 2026-09-29 |
| `public/iys/tiles/dont-go-out-fluffy-pjoys.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/dont-go-out-fluffy-pjoys-fluffy-pjoys-in-your-shoe-560177.jpg | product detail photo (pattern) | Don't Go Out Fluffy Pjoys | 2026-09-29 |
| `public/iys/thumbs/dropout-oversized-hoodie.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/dropout-oversized-hoodie-printed-hoodies-in-your-shoe-209981.jpg | product thumbnail | Dropout Oversized Hoodie | 2026-09-29 |
| `public/iys/thumbs/mustard-guarded-boxy-zip-up-hoodie.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/mustard-afterclass-boxy-zip-up-hoodie-zip-up-hoodies-in-your-shoe-160129.jpg | product thumbnail | Mustard Guarded Boxy Zip-Up Hoodie | 2026-09-30 |
| `public/iys/thumbs/dark-grey-guarded-boxy-zip-up-hoodie.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/dark-grey-afterclass-boxy-zip-up-hoodie-zip-up-hoodies-in-your-shoe-305694.jpg | product thumbnail | Dark Grey Guarded Boxy Zip-Up Hoodie | 2026-09-30 |
| `public/iys/thumbs/afterclass-oversized-quarter-zipper.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/afterclass-oversized-quarter-zipper-quarter-zipper-in-your-shoe-981908.jpg | product thumbnail | Afterclass Oversized Quarter Zipper | 2026-09-29 |
| `public/iys/thumbs/off-white-raglan-oversized-pullover.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/off-white-raglan-oversized-pullover-pullovers-in-your-shoe-513031.jpg | product thumbnail | Off White Raglan Oversized Pullover | 2026-09-29 |
| `public/iys/thumbs/butter-yellow-raglan-oversized-pullover.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/butter-yellow-raglan-oversized-pullover-pullovers-in-your-shoe-603787.jpg | product thumbnail | Butter Yellow Raglan Oversized Pullover | 2026-09-29 |
| `public/iys/thumbs/pink-raglan-oversized-pullover.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/pink-raglan-oversized-pullover-pullovers-in-your-shoe-686157.jpg | product thumbnail | Pink Raglan Oversized Pullover | 2026-09-29 |
| `public/iys/thumbs/claimed-territory-oversized-long-sleeves.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/claimed-territory-oversized-long-sleeves-long-sleeves-in-your-shoe-720625.jpg | product thumbnail | Claimed Territory Oversized Long Sleeves | 2026-09-29 |
| `public/iys/thumbs/egyptian-culture-oversized-long-sleeves.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/egyptian-culture-oversized-long-sleeves-long-sleeves-in-your-shoe-282745.jpg | product thumbnail | Egyptian Culture Oversized Long Sleeves | 2026-09-29 |
| `public/iys/thumbs/city-runners-oversized-long-sleeves.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/city-runners-oversized-long-sleeves-long-sleeves-in-your-shoe-134910.jpg | product thumbnail | City Runners Oversized Long Sleeves | 2026-09-29 |
| `public/iys/thumbs/brown-plaid-balloon-pants.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/brown-plaid-balloon-pants-pants-in-your-shoe-463594.jpg | product thumbnail | Brown Plaid Balloon Pants | 2026-09-29 |
| `public/iys/thumbs/navy-plaid-balloon-pants.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/heather-grey-double-layered-long-sleeve-top-long-sleeve-tops-in-your-shoe-161609.jpg | product thumbnail | Navy Plaid Balloon Pants | 2026-09-29 |
| `public/iys/thumbs/female-brown-baggy-leather-pants.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/female-brown-baggy-leather-pants-leather-pants-in-your-shoe-841728.jpg | product thumbnail | Female Brown Baggy Leather Pants | 2026-09-29 |
| `public/iys/thumbs/female-green-corduroy-pants-1.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/female-green-corduroy-pants-pants-in-your-shoe-283690.jpg | product thumbnail | Female Green Corduroy Pants | 2026-09-29 |
| `public/iys/thumbs/female-brown-corduroy-pants-1.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/brown-double-layered-long-sleeve-top-long-sleeve-tops-in-your-shoe-742065.jpg | product thumbnail | Female Brown Corduroy Pants | 2026-09-29 |
| `public/iys/thumbs/female-denim-blue-washed-wide-leg-jeans.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/female-denim-blue-washed-wide-leg-jeans-jeans-in-your-shoe-101686.jpg | product thumbnail | Female Denim Blue Washed Wide Leg Jeans | 2026-09-29 |
| `public/iys/thumbs/female-navy-washed-barrel-fit-jeans.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/female-navy-washed-barrel-fit-jeans-jeans-in-your-shoe-388156.jpg | product thumbnail | Female Navy Washed Barrel Fit Jeans | 2026-09-29 |
| `public/iys/thumbs/male-black-loose-parachute-pants.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/city-runners-oversized-long-sleeves-long-sleeves-in-your-shoe-290831.jpg | product thumbnail | Male Black Loose Parachute Pants | 2026-09-29 |
| `public/iys/thumbs/green-basic-boxy-zip-up-hoodie.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/green-basic-boxy-zip-up-hoodie-zip-up-hoodies-in-your-shoe-589128.jpg | product thumbnail | Green Basic Boxy Zip-Up Hoodie | 2026-09-29 |
| `public/iys/thumbs/heather-grey-basic-boxy-zip-up-hoodie.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/heather-grey-basic-boxy-zip-up-hoodie-zip-up-hoodies-in-your-shoe-252413.jpg | product thumbnail | Heather Grey Basic Boxy Zip-Up Hoodie | 2026-09-29 |
| `public/iys/thumbs/black-basic-boxy-zip-up-hoodie.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/black-basic-boxy-zip-up-hoodie-zip-up-hoodies-in-your-shoe-603806.jpg | product thumbnail | Black Basic Boxy Zip-Up Hoodie | 2026-09-29 |
| `public/iys/thumbs/greige-oversized-quarter-zipper.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/greige-oversized-quarter-zipper-quarter-zipper-in-your-shoe-998221.jpg | product thumbnail | Greige Oversized Quarter Zipper | 2026-09-29 |
| `public/iys/thumbs/iys-racing-club-oversized-crewneck.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/iys-racing-club-oversized-crewneck-crewnecks-in-your-shoe-169225.jpg | product thumbnail | IYS Racing Club Oversized Crewneck | 2026-09-29 |
| `public/iys/thumbs/blue-basic-boxy-crewneck.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/blue-basic-boxy-crewneck-crewnecks-in-your-shoe-704213.jpg | product thumbnail | Blue Basic Boxy Crewneck | 2026-09-29 |
| `public/iys/thumbs/green-basic-oversized-crewneck.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/green-basic-oversized-crewneck-crewnecks-in-your-shoe-122550.jpg | product thumbnail | Green Basic Oversized Crewneck | 2026-09-29 |
| `public/iys/thumbs/black-basic-oversized-crewneck.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/black-basic-oversized-crewneck-crewnecks-in-your-shoe-894495.jpg | product thumbnail | Black Basic Oversized Crewneck | 2026-09-29 |
| `public/iys/thumbs/burgundy-basic-oversized-crewneck.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/burgundy-basic-oversized-crewneck-crewnecks-in-your-shoe-885269.jpg | product thumbnail | Burgundy Basic Oversized Crewneck | 2026-09-29 |
| `public/iys/thumbs/el-hob-moqawma-boxy-hoodie.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/el-hob-moqawma-boxy-hoodie-boxy-hoodies-in-your-shoe-503954.jpg | product thumbnail | El Hob Moqawma Boxy Hoodie | 2026-09-29 |
| `public/iys/thumbs/brown-basic-heavy-boxy-hoodie-1.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/brown-basic-heavy-boxy-hoodie-plain-hoodies-in-your-shoe-254155.jpg | product thumbnail | Brown Basic Heavy Boxy Hoodie | 2026-09-29 |
| `public/iys/thumbs/heather-grey-basic-heavy-boxy-hoodie.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/heather-grey-basic-heavy-boxy-hoodie-plain-hoodies-in-your-shoe-228198.jpg | product thumbnail | Heather Grey Basic Heavy Boxy Hoodie | 2026-09-29 |
| `public/iys/thumbs/male-dark-blue-striped-loose-fit-jeans.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/male-dark-blue-striped-loose-fit-jeans-jeans-in-your-shoe-288795.jpg | product thumbnail | Male Dark Blue Striped Loose Fit Jeans | 2026-09-29 |
| `public/iys/thumbs/international-council-oversized-hoodie.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/international-council-oversized-hoodie-printed-hoodies-in-your-shoe-557292.jpg | product thumbnail | International Council Oversized Hoodie | 2026-09-29 |
| `public/iys/thumbs/cairo-is-a-mindset-oversized-hoodie.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/cairo-is-a-mindset-oversized-hoodie-printed-hoodies-in-your-shoe-798730.jpg | product thumbnail | Cairo Is A Mindset Oversized Hoodie | 2026-09-29 |
| `public/iys/thumbs/dont-panic-oversized-hoodie.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/dont-panic-oversized-hoodie-printed-hoodies-in-your-shoe-607284.jpg | product thumbnail | Don't Panic Oversized Hoodie | 2026-09-29 |
| `public/iys/thumbs/insane-oversized-hoodie.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/insane-oversized-hoodie-printed-hoodies-in-your-shoe-261352.jpg | product thumbnail | Insane Oversized Hoodie | 2026-09-29 |
| `public/iys/thumbs/horse-race-club-oversized-hoodie.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/el-hob-moqawma-boxy-hoodie-boxy-hoodies-in-your-shoe-196240.jpg | product thumbnail | Horse Race Club Oversized Hoodie | 2026-09-29 |
| `public/iys/thumbs/anti-running-oversized-hoodie.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/anti-running-oversized-hoodie-printed-hoodies-in-your-shoe-252058.jpg | product thumbnail | Anti-Running Oversized Hoodie | 2026-09-29 |
| `public/iys/thumbs/world-wide-tour-oversized-hoodie.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/worldwide-tour-oversized-hoodie-printed-hoodies-in-your-shoe-437318.jpg | product thumbnail | Worldwide Tour Oversized Hoodie | 2026-09-29 |
| `public/iys/thumbs/cairo-legacy-oversized-hoodie.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/cairo-legacy-oversized-hoodie-printed-hoodies-in-your-shoe-975523.jpg | product thumbnail | Cairo Legacy Oversized Hoodie | 2026-09-29 |
| `public/iys/thumbs/brown-embroidered-oversized-leather-jacket.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/brown-embroidered-oversized-leather-jacket-leather-jacket-in-your-shoe-190668.jpg | product thumbnail | Brown Embroidered Oversized Leather Jacket | 2026-09-29 |
| `public/iys/thumbs/teal-embroidered-oversized-leather-jacket.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/teal-embroidered-oversized-leather-jacket-leather-jacket-in-your-shoe-584059.jpg | product thumbnail | Teal Embroidered Oversized Leather Jacket | 2026-09-29 |
| `public/iys/thumbs/give-me-a-raise-oversized-hoodie.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/give-me-a-raise-oversized-hoodie-printed-hoodies-in-your-shoe-496910.jpg | product thumbnail | Give Me A Raise Oversized Hoodie | 2026-09-29 |
| `public/iys/thumbs/heritage-culture-oversized-hoodie.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/heritage-culture-oversized-hoodie-printed-hoodies-in-your-shoe-521513.jpg | product thumbnail | Heritage Culture Oversized Hoodie | 2026-09-29 |
| `public/iys/thumbs/save-the-turtles-oversized-hoodie.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/save-the-turtles-oversized-hoodie-printed-hoodies-in-your-shoe-381261.jpg | product thumbnail | Save The Turtles Oversized Hoodie | 2026-09-29 |
| `public/iys/thumbs/blue-basic-oversized-hoodie.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/blue-basic-oversized-hoodie-plain-hoodies-in-your-shoe-935918.jpg | product thumbnail | Blue Basic Oversized Hoodie | 2026-09-29 |
| `public/iys/thumbs/gingham-fluffy-pjoys.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/gingham-fluffy-pjoys-fluffy-pjoys-in-your-shoe-494112.jpg | product thumbnail | Gingham Fluffy Pjoys | 2026-09-29 |
| `public/iys/thumbs/green-plaid-fluffy-pjoys.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/green-plaid-fluffy-pjoys-fluffy-pjoys-in-your-shoe-540506.jpg | product thumbnail | Green Plaid Fluffy Pjoys | 2026-09-29 |
| `public/iys/thumbs/red-plaid-fluffy-pjoys.webp` | https://cdn.shopify.com/s/files/1/0050/2729/9397/files/red-plaid-fluffy-pjoys-fluffy-pjoys-in-your-shoe-424551.jpg | product thumbnail | Red Plaid Fluffy Pjoys | 2026-09-29 |
<!-- assets:end -->
