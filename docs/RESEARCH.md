# Research notes — IYS INTERNET 2006

Summaries only (no copied passages). Brand facts were read on the public
Egyptian storefront on **2026-09-29**; see `SOURCES.md` for URLs.

## 1. The brand, today (public sources)

- **Storefront**: Shopify, Egyptian market (`content-language: en-EG`,
  `Shopify.currency.active = EGP`). The same store also serves `/en-sa`,
  `/en-uae`, `/en-kw`, `/en-uk`, `/en-international` with converted prices — the
  sync ignores them.
- **Size**: 1,249 publicly published products; IYS’s own *All Products*
  collection lists 1,224 of them. The other 25 are collaboration capsules
  (IYS × ZED, Silver Sands) that are public but not in that collection.
- **Brand kit** (theme settings in the page source): primary `#FF6060`, text
  `#06478E`, secondary text `#4B87C8` → the OS uses IYS blue for title bars and
  the taskbar, IYS coral for “act” controls (close, add to bag, the menu button).
- **Logos**: current vector `IYS` mark (`IYS_LOGO.svg`, homepage header) and the
  `IN YOUR SHOE` wordmark (white header version + black version).
- **Official lines** (verified): “You’re about to make a Cool Decision!”
  (marquee/footer), “The Coolest Apparel In Town!” (page title), the cool-list
  10% line, “Same-day delivery available ⚡”, “Free Shipping +2,499”, and the
  Pjoys definition from product descriptions. Promotions are volatile; they are
  dated in the UI.
- **Current campaign**: the FW27 homepage banners are staged with **CRT TVs,
  old monitors and a record player** — the brand’s own imagery already reaches
  for old technology. The concept uses those photos as *current* campaign
  imagery shown inside a fictional 2006 machine, never as “archive” photos.
- **Egypt/Cairo in the range**: IYS runs its own `cairo` collection (48 items at
  snapshot) — *Qasr El Nile*, *Heliopolis*, *El Giza*, *Soot Elshare3*,
  *Masr* cap, *Kairo Pop* jersey, *Cairo Is A Mindset* hoodie. That real range,
  not tourist imagery, is what gives the Cairo folder its character.
- **Playful product names** used as UI jokes (names untouched): *Touch Grass
  Pjoys* → `TOUCH_GRASS.EXE` (“ERROR: TOUCH GRASS NOT FOUND.”), *Game Night
  Pjoys* → `GAME_NIGHT.EXE`.
- **Stores**: 10 stores on the public store page (Cairo, Giza, New Cairo,
  Alexandria, El Gouna), with address lines, hours and phone numbers (one store
  lists no phone — shown as “Not listed”).

## 2. Period interfaces, 2004–2007 (what we borrowed, what we avoided)

Observed traits of mid-2000s desktop software, applied as an *original* system:

| Trait | Period reality | IYS OS decision |
| --- | --- | --- |
| Window chrome | Two-tone glossy title bars (~25 px), 3–4 px frames, tiny 3D caption buttons, rounded top corners only | Glossy IYS-blue title bars, 3 px frame, 22×20 caption buttons; close button in IYS coral. No Luna/Aero colours. |
| Type | Tahoma 8 pt / Verdana on the web | Tahoma → Verdana → DejaVu stack at 11–13 px; commerce text 13–15 px for 2026 legibility. No webfonts. |
| Controls | Bevelled buttons, sunken inputs, dotted focus, checkbox ticks, tab property sheets | Real `<button>`/`<input>`/`<select>` restyled; dotted focus kept but thicker. |
| Browsers | Back/Forward/Refresh/Home toolbar with text labels, address bar with page icon, “Links” bar, status bar with zone | IYS INTERNET mirrors the real route in a fake `http://www.inyourshoe.com/...` address; status bar replaces toasts. |
| Messengers | Buddy lists with status orbs, personal messages, conversation windows with display pictures, file transfers with progress | Original buddy list (collections as contacts), “PJOYS says:” lines, file-transfer cards carrying real products. No logos, no winks/nudges, no copied sounds. |
| Explorers | Tree + thumbnails/details views, address like `C:\...`, status “N objects” | MY WARDROBE and IYS CAMERA share one explorer layout; counts come from data. |
| Digital cameras | `DCIM`, `IMG_0001.JPG`, orange date stamps, 4:3 | 4:3 contact sheet with a fictional `TM▸2006` stamp (explicitly not a date). Camera treatment only on campaign/lifestyle frames — never on commerce photos. |
| Web | 88×31 buttons, marquees, hit counters, guestbooks, “best viewed at 1024×768” | One CSS marquee (reduced-motion aware), original badges, a counter labelled *fictional*, an honest empty guestbook. |
| Phones 2005–07 | Signal/battery strip, path titles, list menus, soft keys, 3×3 home grids | IYS MOBILE: original icons, soft-key bar with context centre key, 44 px targets, swipe gallery. |

Avoided on purpose: Windows/IE/MSN/AOL/Winamp/MySpace/Nokia logos, Bliss-style
wallpaper, XP icon sets or `xp.css`, sampled system sounds, pink-chrome “Y2K”,
glassmorphism, pills, bento grids.

## 3. Egypt, mid-2000s computing (context, used lightly)

- Egypt’s **Free Internet** initiative (from January 2002) let anyone with a
  phone line dial special non-geographic numbers and pay only the call cost;
  Telecom Egypt counted ~750,000 lines using it by early 2003. ADSL spread later
  in the decade. (Wikipedia “Internet in Egypt”; Al Bawaba, 2002.)
- Chat in that era was typed in **Franco-Arabic** (“Arabizi”): Latin letters
  plus digits for Arabic sounds — `3` = ع, `7` = ح, `2` = ء. The PJOYS opener
  pairs “u awake?” with the Egyptian Franco line **“enta sa7y?”** (“are you
  awake?”), labelled for non-Arabic readers.
- Arabic appears only as small, correct micro-details (القاهرة on the Cairo
  folder) with proper `lang`/`dir` isolation — no machine translation of the
  catalogue.

## 4. Why these UX calls

- Single click opens everything; no double-click requirement.
- The catalogue is paged 48 at a time with old-school pagination — it suits the
  period *and* keeps the DOM small.
- Add-to-bag animation is a < 1 s confirmation, never a delay.
- Sound is off by default; the boot is ~2 s, skippable, and once per session.
