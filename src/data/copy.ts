/**
 * COPY REGISTRY
 *
 * OFFICIAL - existing In Your Shoe language, re-verified on the public
 *            Egyptian storefront on 2026-09-29, with where it appears.
 *            Promotions are volatile: re-verify before each publish.
 * CONCEPT  - campaign lines for IN YOUR SHOE 2006 (built with Omar Akram, 2026).
 *            Never present these as IYS copy.
 */

export const OFFICIAL_VERIFIED_ON = '2026-09-29';
/** The announcement-bar lines below were re-read on the live store on this date (they change often). */
export const ANNOUNCEMENT_VERIFIED_ON = '2026-10-26';

export const official = {
  /** Scrolling marquee + footer, https://inyourshoe.com/ */
  coolDecision: 'You’re about to make a Cool Decision!',
  /** <title> of https://inyourshoe.com/ */
  coolestApparel: 'The Coolest Apparel In Town!',
  /** meta description of https://inyourshoe.com/ */
  standOut: 'Stand out, Express yourself! We put ourselves in your shoe, in style! :)',
  /** Footer newsletter block, https://inyourshoe.com/ */
  coolList: 'Join our cool list and receive a 10% OFF code for your 1st purchase!',
  /** Announcement bar, https://inyourshoe.com/ (re-verified ANNOUNCEMENT_VERIFIED_ON) */
  sameDay: 'SAME DAY DELIVERY',
  /** Announcement bar, https://inyourshoe.com/ (re-verified ANNOUNCEMENT_VERIFIED_ON; the bag reads the rule from src/config/promotions.ts) */
  freeShipping: 'FREE SHIPPING OVER 3999 EGP',
  /** Pjoys product descriptions, e.g. https://inyourshoe.com/products/cereal-killer-pjoys */
  pjoys: 'Pjoys are our terminology for pyjama pants that are super joyful, just like you reading this.',
  brand: 'IN YOUR SHOE',
} as const;

export const officialSources = {
  home: 'https://inyourshoe.com/',
  stores: 'https://inyourshoe.com/pages/store-locations',
  collections: 'https://inyourshoe.com/collections/all-products',
} as const;

/** ── CONCEPT COPY - NOT OFFICIAL BRAND LANGUAGE ─────────────────────── */
export const concept = {
  name: 'IYS INTERNET 2006',
  os: 'IYS OS',
  targetYear: '2006',
  thesis: 'What if today’s In Your Shoe travelled back to the internet of 2006?',
  boot: {
    machine: 'IYS PERSONAL COMPUTER',
    lines: [
      ['MEMORY', 'OK'],
      ['WARDROBE', 'DETECTED'],
      ['INTERNET', 'CONNECTED'],
      ['COOL DECISIONS', 'READY :)'],
    ] as [string, string][],
    target: 'TIME TARGET: 2006',
    connecting: 'CONNECTING 2 IYS INTERNET... brb :)',
    skip: 'SKIP',
  },
  dialog: { app: 'IYS.EXE', cancel: 'Cancel', ok: 'Obviously', postponed: 'cool decision postponed. it’ll wait 4 u xo' },
  notFound: { title: 'IYS.EXE', line: 'omg this page went offline :(' },
  imageOffline: 'IMAGE COULD NOT LOAD :(',
  /** Large photo frames while the photo is on its way (same flying-file look as ADD TO BAG). */
  loadingPhoto: 'Copying photo...',
  copying: 'COPYING ITEM TO:',
  itemAdded: 'ADDED 2 BAG :)',
  wallpaperUpdated: 'WALLPAPER UPDATED xo',
  touchGrass: { title: 'TOUCH_GRASS.EXE', loaded: 'TOUCH_GRASS.EXE loaded :) go touch some grass lol' },
  gameNight: 'GAME_NIGHT.EXE',
  /** CHECKOUT hands the bag to the official IYS checkout; this shows only if a line can't be carried over. */
  checkout: {
    errorTitle: 'CHECKOUT COULDN’T START :(',
    realErrorTitle: 'REAL IYS COULDN’T OPEN :(',
    /** The global switch: the site u r on, and the real store. */
    here: 'IYS 2006',
    real: 'REAL IYS',
    realHint: 'switch to the real In Your Shoe store',
    errorMessage: 'ONE OF UR ITEMS NEEDS A REFRESH. open it, pick ur size again and re-add it - ur bag is still here xo',
    errorAction: 'Open item',
    /** Live checkout only: Shopify answered but couldn't take a line exactly as it is in the bag. */
    liveMismatch: 'IYS SAYS ONE OF UR ITEMS ISN’T AVAILABLE LIKE THAT RIGHT NOW (size or quantity). open it to check - ur bag is still here xo',
  },
  /** IYS MAIL - real support mail to orders@inyourshoe.com. */
  mail: {
    title: 'IYS MAIL',
    send: 'SEND MAIL :)',
    sending: 'Sending mail...',
    retry: 'TRY AGAIN :(',
    done: 'MAIL SENT :) xo',
    doneSub: 'The IYS team got ur message at orders@inyourshoe.com and will reply to the email u gave. ttyl!',
    another: 'Write another',
    errorTitle: 'MAIL NOT SENT :(',
    failed: 'Could not reach the mail server. Ur message is still here - please try again.',
    /** The mail function answered, but not with a result (crashed / not deployed). Never "sent". */
    serverError: (status: number) => `The mail server had a problem (HTTP ${status}), so ur message was NOT sent. It is still here - try again or use ur email app.`,
    retrying: 'Mail server is slow, trying again...',
    placeholder: 'hi IYS! my message is...',
    note: 'Goes to orders@inyourshoe.com. We only use ur details to reply.',
    /** No mail provider configured on this deployment: say so, never pretend it was sent. */
    notConnectedTitle: 'IYS MAIL IS NOT CONNECTED YET',
    notConnected: 'Ur message was NOT sent. Open ur own email app and we fill it in for u, addressed to orders@inyourshoe.com.',
    notConnectedStatus: 'Not sent. IYS MAIL is not connected yet.',
    openApp: 'OPEN EMAIL APP ↗',
    orOpenApp: 'or send it from ur own email app:',
  },
  /** IYS GAMES rewards: only real, live merchant codes confirmed by /api/rewards. Nothing shows otherwise. */
  rewards: {
    ready: (label: string, score: number) => `REAL IYS REWARD: ${label} (score ${score}+)`,
    next: (label: string, score: number) => `score ${score}+ to unlock ${label}`,
    earned: 'U UNLOCKED A REAL IYS REWARD :)',
    claim: 'GET MY CODE',
    claiming: 'checking with IYS...',
    copy: 'COPY CODE',
    copied: 'COPIED :)',
    use: 'USE IN MY BAG',
    used: 'SAVED IN MY BAG :)',
    note: 'Real IYS code. IYS applies its own terms at checkout.',
  },
  /** IYS NEWSLETTER - the cool list. The code is revealed only after a real, confirmed signup. */
  newsletter: {
    title: 'IYS NEWSLETTER',
    headline: 'JOIN THE COOL LIST :)',
    sub: 'GET 10% OFF UR FIRST ORDER',
    join: 'JOIN XO',
    joining: 'Joining...',
    invalid: 'hmm that email looks off :( check it?',
    error: 'Could not join right now :( ur email is still here - try again?',
    offlineTitle: 'COOL LIST: COMING ONLINE SOON :)',
    offlineSubmit: 'COOL LIST CONNECTION IS STILL COMING ONLINE :)',
    offlineSubmitSub: 'ur email wasn’t sent yet.',
    offline: 'The signup line isn’t connected yet, so nobody is added and no code is issued from here. Join the real list on inyourshoe.com meanwhile.',
    successTitle: 'UR ON THE COOL LIST :)',
    successCode: '10% OFF CODE:',
    copy: 'Copy code',
    copied: 'CODE COPIED xo',
  },
  /** Odoo-hosted forms (URLs configured in src/config/integrations.ts). */
  help: {
    title: 'IYS HELP & SUPPORT',
    heading: 'IYS HELP CENTER :)',
    pending: 'Support form connection: coming online soon',
    placeholder: 'ODOO FORM PLACEHOLDER',
    open: 'OPEN SUPPORT FORM ↗',
  },
  exchange: {
    icon: 'XCHANGE.EXE :) EXCHANGES/REFUNDS',
    title: 'XCHANGE.EXE :) - EXCHANGES / REFUNDS FORM',
    heading: 'EXCHANGES / REFUNDS FORM',
    pending: 'form connection coming online soon :)',
    placeholder: 'Odoo form will load here',
    open: 'OPEN FORM ↗',
  },
  /** Easter-egg graffiti signature. Concept copy - never inside official IYS lines. */
  catchy: {
    footer: 'Catchy was here XD',
    notFound: 'Catchy was here ;P',
    recycle: 'Catchy was here :)',
  },
  readme: [
    'you made a cool decision.',
    '',
    'this is IN YOUR SHOE, running on a computer from 2006:',
    'the real store, the whole catalogue, dressed up like it’s 2006.',
    '',
    'Every product, price and photo inside is real and public,',
    'copied from inyourshoe.com at the snapshot time shown in',
    'Control Panel. Add to bag here - real checkout on inyourshoe.com.',
    '',
    '- Omar Akram, 2026',
    '',
    '',
    '',
    '(Catchy was here <3)',
  ],
  recycle: { title: 'RECYCLE BIN', folder: 'BORING_OUTFITS', empty: 'this folder is empty. nobody here dresses boring xd' },
  snapshot: 'Prices & availability as of the catalogue snapshot',
  guestbook: 'no entries yet :( (no reviews shown - we don’t invent customers)',
  counterLabel: 'TIME TRAVELLERS:',
  counterNote: 'Fictional counter. Not analytics.',
  messenger: {
    pjoysOpener: 'u awake?',
    /** Egyptian Franco-Arabic ("are you awake?") - period-accurate chat script. */
    pjoysFranco: 'enta sa7y?',
    pjoysAfter: ['omg found these 4 the sleepover XD'],
    /** Early/mid-2000s IM voice (MSN/AIM era). Text only - the Messenger UI itself is unchanged. */
    pjoysSignIn: 'PJOYS has just signed in. its 2:13 AM somewhere... sleepover mode',
    pjoysWallpapers: 'also made u some wallpapers :P',
    pjoysOutro: (online: number) => `ok pick 1. obviously ;) ${online} pjoys online rn lol, ttyl xo`,
    buddyStatus: (name: string, status: string) => `${name} is ${status}.`,
    buddyOutro: (shown: number, total: number) => `thats ${shown} of ${total} btw. the rest r in the shop, brb :)`,
    autoReply: (name: string) => `${name} is afk rn. auto-reply: brb!! the whole collection is open in IYS INTERNET →`,
    myMood: '<makin cool decisions ;)>',
    howTo: { title: 'How 2 use IYS Messenger :)', lines: ['1. pick a buddy', '2. type ur msg', '3. hit send', 'ttyl :)'] },
    about: {
      title: 'About IYS Messenger',
      lines: ['IYS MESSENGER is part of IN YOUR SHOE 2006.', 'Buddies are real IYS collections. Chats are scripted copy: no real people, no bots.'],
    },
  },
  /**
   * Y2K voice (team feedback, 2026-09): 2000s-internet slang used on CTAs and
   * small UI moments. One slang beat per line, max - readable first.
   */
  y2k: {
    heroKicker: 'omg new drop just landed :)',
    primary: 'Shop the drop',
    secondary: 'Explore pjoys xo',
    shopAll: 'Shop all',
    enter: 'Enter IYS :)',
    quick: 'bff shortcuts',
    justDropped: 'just dropped ✧ fresh 4 u',
    seeAllNew: 'see all new stuff',
    newsletterTitle: 'subscribe 2 our newsletter xoxo',
    newsletterCta: 'Subscribe xo',
    newsletterNote: 'opens the real cool list on inyourshoe.com - this concept stores nothing.',
    ping: '1 new msg from PJOYS :)',
    wasHere: 'IYS was here XD',
    add: 'ADD TO BAG',
    /** Mobile center soft key only: same add action, shorter label that fits the key on one line down to 320 px. */
    addSoft: '+ MY BAG',
    addLong: 'brb adding this 2 bag',
    pickSize: 'PICK SIZE',
    soldOut: 'SOLD OUT :(',
    fitNote: 'u + this fit = meant 2 b xx',
    tooCute: 'too cute 2 skip xo',
    seeOnIys: 'see it on IYS ↗',
    filter: 'Sort & filter',
    noResults: '0 results :( try fewer filters?',
    searchPlaceholder: 'wat r u looking 4?',
    favEmpty: 'no favs yet :( tap ☆ on sth u love',
    bagEmpty: 'ur bag is empty :( go get sth cute',
    bagCta: 'CHECKOUT xx',
    bagNote: 'snapshot prices in EGP · final total confirmed at IYS checkout',
    stores: 'come say hi IRL :)',
    notFoundSub: 'no worries, the fits r still here. ttyl 404',
    menuHint: 'everything else lives here xo',
    seeMoreTop8: (n: string) => `see more cool decisions :) shop all ${n} ›`,
    shopCairo: (n: string) => `Shop Cairo (${n}) ›`,
    openCollection: (n: string) => `Open collection (${n} items) ›`,
    added: 'ADDED 2 BAG :)',
    viewBag: 'VIEW BAG',
    keepShopping: 'KEEP SHOPPING XO',
    pickSizeFirst: 'Pick a size first :)',
    back2Shop: 'BACK 2 SHOP',
    shopNew: 'SHOP NEW STUFF',
  },
  /** MY BAG extras: shipping progress, code, ideas, handoff (rules in src/config/promotions.ts). */
  bag: {
    shipLeft: (amount: string) => `${amount} MORE 4 FREE SHIPPING*`,
    shipJust: 'JUST A LIL MORE 4 FREE SHIPPING*',
    shipUnlocked: 'FREE SHIPPING UNLOCKED* xo',
    shipNote: (threshold: string, checked: string, live = false) =>
      live
        ? `*IYS store: free shipping from ${threshold} (checked live with the IYS store today). IYS confirms shipping at checkout.`
        : `*IYS: free shipping over ${threshold} (inyourshoe.com, checked ${checked}). Uses snapshot prices; IYS confirms shipping at checkout.`,
    codeToggle: 'GOT A CODE?',
    codeLabel: 'Discount code',
    codeApply: 'USE CODE',
    codeSaved: (code: string) => `CODE ${code} SAVED :) IYS checks it at checkout (it can’t be checked from here).`,
    codeLiveOk: (code: string) => `CODE ${code} APPLIES TO UR BAG :)`,
    codeLiveNo: (code: string) => `CODE ${code} DOESN’T APPLY TO THIS BAG :(`,
    codeBad: 'that doesn’t look like an IYS code :( letters, numbers, - and _ only',
    codeRemove: 'remove',
    offersTitle: 'OFFERS',
    upsellTitle: 'U MIGHT ALSO LIKE',
    upsellPick: 'PICK SIZE ›',
    upsellOptions: 'CHOOSE OPTIONS ›',
    upsellAdd: '+ ADD',
    handoffCheckout: 'Opening IYS checkout...',
    handoffReal: 'Opening real IYS...',
    handoffSlow: 'taking a while?',
    handoffDirect: 'open it directly ↗',
  },
  /** Product carousels (src/components/shop/ProductCarousel.tsx). Real products only. */
  reco: {
    productTitle: 'MORE LIKE THIS',
    productNote: 'from IYS’s own collections',
    bagNote: 'real IYS pieces 4 ur bag',
    prev: 'Previous products',
    next: 'More products',
    trackLabel: (title: string, n: number) => `${title}: ${n} products, scroll sideways`,
  },
  /** The escape route (src/lib/frustration.ts): caring and funny, never pushy. */
  escape: {
    title: 'IYS.EXE',
    heading: 'COMPUTER SAYING NO? :(',
    body: 'WANNA SHOP THE EASY WAY? this 2006 computer can be a lot lol. the real IYS site is one tap away.',
    bag: (n: number) => `ur bag (${n} ${n === 1 ? 'item' : 'items'}) comes with u.`,
    open: 'TAKE ME TO REAL IYS ↗',
    stay: 'NAH I’M GOOD',
    stayed: 'ok! we’ll stop asking xo',
    /** MENU item (desktop + mobile): leave any time, no frustration needed. */
    menuItem: 'OPEN REAL IYS ↗',
    menuSub: 'inyourshoe.com · ur bag comes along',
  },
  /** SIZE GUIDE: official IYS chart images only (see src/lib/sizeCharts.ts). */
  sizeGuide: {
    button: 'SIZE GUIDE',
    title: (product: string) => `SIZE GUIDE - ${product}`,
    loading: 'Opening size chart...',
    error: 'The size chart couldn’t load :( check ur connection and try again.',
    missing: 'IYS hasn’t published a size chart for this one (yet). Ask IYS before u pick a size :)',
    gone: 'This item’s page isn’t on inyourshoe.com anymore, so there’s no official chart to show.',
    source: (checkedOn: string) => `Official IYS size chart, as shown on this item’s page on inyourshoe.com (checked ${checkedOn}). Units exactly as printed on the chart.`,
    ask: 'ASK IYS ABOUT SIZING',
    askMobile: 'CONTACT IYS ↗',
  },
  disclaimer: [
    'IN YOUR SHOE - 2006.',
    'Our store, in a 2006 computer.',
    'Built with Omar Akram, 2026.',
    'Products, prices, stock and checkout are handled by In Your Shoe (inyourshoe.com).',
  ],
} as const;
