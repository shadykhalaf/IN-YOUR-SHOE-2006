/**
 * How the OS maps IYS's OWN public collections into menus, folders and
 * messenger contacts. Only collection HANDLES are chosen here — titles and
 * every count come from the synced catalogue at runtime, and an entry whose
 * collection is missing or empty after a sync simply disappears.
 */

/** IYS menu (taskbar). Mirrors the storefront's top navigation. */
export const MENU: { label: string; collection: string | null; to?: string }[] = [
  { label: 'SHOP ALL', collection: null, to: '/shop' },
  { label: 'NEW', collection: 'newest' },
  { label: 'PJOYS', collection: 'pjoys' },
  { label: 'FLUFFY PJOYS', collection: 'fluffy-pjoys' },
  { label: 'TOPS', collection: 'all-tops' },
  { label: 'BOTTOMS', collection: 'all-bottoms' },
  { label: 'HOMEWEAR', collection: 'homewear' },
  { label: 'ACCESSORIES', collection: 'all-accessories' },
  { label: 'WOMEN', collection: 'women' },
  { label: 'KIDS', collection: 'all-kids-products' },
  { label: 'CAIRO', collection: 'cairo' },
  { label: 'ON SALE', collection: 'on-sale' },
];

export interface Folder {
  collection: string;
  label: string;
  children?: Folder[];
}

/** MY WARDROBE tree — parents are IYS's own "all-*" collections. */
export const WARDROBE: Folder[] = [
  {
    collection: 'all-tops',
    label: 'TOPS',
    children: [
      { collection: 'hoodies', label: 'HOODIES' },
      { collection: 't-shirts', label: 'T-SHIRTS' },
      { collection: 'long-sleeves-and-polos', label: 'LONG SLEEVES' },
      { collection: 'crewnecks', label: 'CREWNECKS' },
      { collection: 'jackets-sweaters', label: 'JACKETS & SWEATERS' },
      { collection: 'shirts', label: 'SHIRTS' },
      { collection: 'jerseys', label: 'JERSEYS' },
      { collection: 'knitwear', label: 'KNITWEAR' },
      { collection: 'tops-vests', label: 'TOPS & VESTS' },
    ],
  },
  {
    collection: 'all-bottoms',
    label: 'BOTTOMS',
    children: [
      { collection: 'pants', label: 'PANTS' },
      { collection: 'jeans', label: 'JEANS' },
      { collection: 'sweatpants', label: 'SWEATPANTS' },
      { collection: 'shorts', label: 'SHORTS' },
      { collection: 'skirts', label: 'SKIRTS' },
      { collection: 'leggings', label: 'LEGGINGS' },
      { collection: 'swimmies', label: 'SWIMMIES' },
    ],
  },
  {
    collection: 'homewear',
    label: 'HOMEWEAR',
    children: [
      { collection: 'pjoys', label: 'PJOYS' },
      { collection: 'fluffy-pjoys', label: 'FLUFFY PJOYS' },
      { collection: 'pshorts', label: 'PSHORTS' },
      { collection: 'pshirts', label: 'PSHIRTS' },
      { collection: 'boxer-shorts', label: 'BOXER SHORTS' },
      { collection: 'boxer-pants', label: 'BOXER PANTS' },
      { collection: 'pantoufles', label: 'PANTOUFLES' },
    ],
  },
  {
    collection: 'all-accessories',
    label: 'ACCESSORIES',
    children: [
      { collection: 'all-socks', label: 'SOCKS' },
      { collection: 'hats-caps', label: 'HEADWEAR' },
      { collection: 'all-bags', label: 'BAGS' },
      { collection: 'bandanas', label: 'BANDANAS' },
      { collection: 'headbands', label: 'HEADBANDS' },
      { collection: 'flowy-wraps', label: 'FLOWY WRAPS' },
      { collection: 'beach-towels', label: 'BEACH TOWELS' },
      { collection: 'others', label: 'OTHERS' },
    ],
  },
  {
    collection: 'women',
    label: 'WOMEN',
    children: [
      { collection: 'baby-tees-jerseys', label: 'BABY TEES & JERSEYS' },
      { collection: 'shirts-polos', label: 'SHIRTS & POLOS' },
      { collection: 'pants-jeans', label: 'PANTS & JEANS' },
      { collection: 'shorts-jorts', label: 'SHORTS & JORTS' },
      { collection: 'all-dresses', label: 'DRESSES' },
      { collection: 'womens-sets', label: 'SETS' },
      { collection: 'bags-for-her', label: 'BAGS' },
    ],
  },
  { collection: 'all-kids-products', label: 'KIDS' },
  { collection: 'cairo', label: 'CAIRO' },
  { collection: 'inyourshoexzed', label: 'IYS x ZED' },
  { collection: 'sportswear', label: 'SPORTSWEAR' },
  { collection: 'on-sale', label: 'ON SALE' },
];

/**
 * IYS MESSENGER buddy list. Status is CONCEPT UI (a mood, not stock data).
 * `opener` lines are concept copy.
 */
export const BUDDIES: { id: string; name: string; collection: string; status: 'online' | 'away' | 'busy'; mood: string; opener: string }[] = [
  { id: 'pjoys', name: 'PJOYS', collection: 'pjoys', status: 'online', mood: 'sleeepover rn lol', opener: 'u awake?' },
  { id: 'new', name: 'NEW STUFF', collection: 'newest', status: 'online', mood: 'omg new drop!! XD', opener: 'omggg new stuff just landed. look :)' },
  { id: 'cairo', name: 'CAIRO', collection: 'cairo', status: 'online', mood: 'cairo 4ever <3', opener: 'ahlan!! sending u the whole city xD' },
  { id: 'hoodies', name: 'HOODIES', collection: 'hoodies', status: 'away', mood: 'brb gettin cozy', opener: 'its gettin cold 2nite... just sayin ;)' },
  { id: 'accessories', name: 'ACCESSORIES', collection: 'all-accessories', status: 'busy', mood: 'fixing ur fit ;)', opener: 'ur outfit is missing sth. trust me lol' },
  { id: 'kids', name: 'IYS KIDS', collection: 'all-kids-products', status: 'away', mood: 'past bedtime lol', opener: 'mini sizes, same cool decisions :P' },
];
