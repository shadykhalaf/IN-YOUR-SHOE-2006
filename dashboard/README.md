# Singles Day control room

A single static page that reads the `k2-track` Supabase function and shows the
Singles Day waiting-room funnel, the Shopify queue, and every "IYS or not"
swipe by product.

It holds no secrets. The dashboard key (`K2_STATS_KEY` in Supabase) is typed in
by whoever opens the page and kept in their own browser, so the page is useless
to anyone who does not have it.

Deployed as its own Vercel project with this folder as the root directory; the
2000s site in the rest of this repository is a separate project and is not
affected.
