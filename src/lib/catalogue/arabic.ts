/**
 * Egyptian Arabic (and clear Franco-Arabic) shopping words → the catalogue's
 * own English concepts. A small, fixed, deterministic lexicon: no AI, no
 * translation service, no network. English search is untouched by this file;
 * it only runs for queries that contain Arabic letters or a known
 * transliteration (see `needsBridge`).
 */
import type { Catalogue, Product } from './types';

export type Group = 'category' | 'color' | 'audience' | 'fit';
interface Concept {
  group: Group;
  /** Shown back to the shopper ("IYS understood: hoodie · black"). */
  label: string;
  /** Matched against a product's lowercased title + type + collections + tags. Static patterns only. */
  match: RegExp;
}

export const CONCEPTS: Record<string, Concept> = {
  hoodie: { group: 'category', label: 'hoodie', match: /\bhoodies?\b/ },
  tee: { group: 'category', label: 'tee', match: /\b(tees?|t-?shirts?)\b/ },
  pants: { group: 'category', label: 'pants', match: /\b(pants|swants|trousers|jeans|sweatpants|joggers)\b/ },
  jeans: { group: 'category', label: 'jeans', match: /\b(jeans?|denims?)\b/ },
  sweatshirt: { group: 'category', label: 'sweatshirt', match: /\b(sweatshirts?|crewnecks?|quarter zip(per)?s?)\b/ },
  pullover: { group: 'category', label: 'pullover / knit', match: /\b(pullovers?|sweaters?|knit\w*|cardigans?)\b/ },
  jacket: { group: 'category', label: 'jacket', match: /\b(jackets?|coats?|windbreakers?|blazers?)\b/ },
  dress: { group: 'category', label: 'dress', match: /\bdress(es)?\b/ },
  pjoys: { group: 'category', label: 'pjoys (pyjamas)', match: /\b(pjoys|pyjamas?|pajamas?|pshorts|pshirts)\b/ },
  socks: { group: 'category', label: 'socks', match: /\bsocks?\b/ },
  cap: { group: 'category', label: 'cap', match: /\b(caps?|hats?|beanies?)\b/ },
  shoes: { group: 'category', label: 'shoes', match: /\b(shoes?|sneakers?|boots?|trainers?)\b/ },
  slippers: { group: 'category', label: 'pantoufles (slippers)', match: /\b(pantoufles?|slippers?)\b/ },
  shorts: { group: 'category', label: 'shorts', match: /\b(shorts|jorts|sworts|pshorts)\b/ },
  shirt: { group: 'category', label: 'shirt', match: /(?<!t-)\bshirts?\b/ },
  skirt: { group: 'category', label: 'skirt', match: /\bskirts?\b/ },
  bag: { group: 'category', label: 'bag', match: /\b(bags?|totes?|laptop sleeves?)\b/ },
  robe: { group: 'category', label: 'robe', match: /\brobes?\b/ },
  boxer: { group: 'category', label: 'boxers', match: /\bboxers?\b/ },
  polo: { group: 'category', label: 'polo', match: /\bpolos?\b/ },
  leggings: { group: 'category', label: 'leggings', match: /\bleggings?\b/ },
  set: { group: 'category', label: 'set', match: /\bsets?\b/ },
  black: { group: 'color', label: 'black', match: /\bblack\b/ },
  white: { group: 'color', label: 'white', match: /\b(white|off[- ]white)\b/ },
  navy: { group: 'color', label: 'navy', match: /\bnavy\b/ },
  grey: { group: 'color', label: 'grey', match: /\b(grey|gray)\b/ },
  red: { group: 'color', label: 'red', match: /\b(red|burgundy|maroon)\b/ },
  blue: { group: 'color', label: 'blue', match: /\bblue\b/ },
  green: { group: 'color', label: 'green', match: /\bgreen\b/ },
  brown: { group: 'color', label: 'brown', match: /\bbrown\b/ },
  beige: { group: 'color', label: 'beige', match: /\bbeige\b/ },
  pink: { group: 'color', label: 'pink', match: /\bpink\b/ },
  yellow: { group: 'color', label: 'yellow', match: /\b(yellow|mustard)\b/ },
  orange: { group: 'color', label: 'orange', match: /\borange\b/ },
  purple: { group: 'color', label: 'purple', match: /\b(purple|lilac|lavender)\b/ },
  olive: { group: 'color', label: 'olive', match: /\bolive\b/ },
  cream: { group: 'color', label: 'off-white / cream', match: /\b(cream|off[- ]white|ivory)\b/ },
  men: { group: 'audience', label: 'men', match: /\b(men|male|unisex)\b/ },
  women: { group: 'audience', label: 'women', match: /\b(women|female|unisex)\b/ },
  kids: { group: 'audience', label: 'kids', match: /\bkids?\b/ },
  wide: { group: 'fit', label: 'wide / loose', match: /\b(wide|loose|baggy|oversized|boxy|relaxed)\b/ },
  oversized: { group: 'fit', label: 'oversized', match: /\boversized?\b/ },
};

/**
 * Normalised Arabic (see `normalizeArabic`) → concept. Plurals and common
 * spellings are listed explicitly; `ال` is also stripped on lookup.
 */
const AR: Record<string, string> = {
  هودي: 'hoodie', هوديز: 'hoodie', هوديات: 'hoodie', هودية: 'hoodie',
  تيشيرت: 'tee', تيشرت: 'tee', تشيرت: 'tee', تيشيرتات: 'tee', تيشرتات: 'tee', 'تي شيرت': 'tee', 'تي شرت': 'tee',
  بنطلون: 'pants', بنطلونات: 'pants', بناطيل: 'pants', بنطال: 'pants', سويت_بانتس: 'pants', ترينج: 'pants',
  جينز: 'jeans', جينزات: 'jeans', 'بنطلون جينز': 'jeans',
  'سويت شيرت': 'sweatshirt', سويتشيرت: 'sweatshirt', سويت: 'sweatshirt',
  بلوفر: 'pullover', بلوفرات: 'pullover', سويتر: 'pullover', تريكو: 'pullover', كارديجان: 'pullover',
  جاكيت: 'jacket', جاكت: 'jacket', جواكت: 'jacket', جاكيتات: 'jacket', بالطو: 'jacket', معطف: 'jacket',
  فستان: 'dress', فساتين: 'dress',
  بيجامه: 'pjoys', بيجامات: 'pjoys', بجامه: 'pjoys', بيجامة: 'pjoys',
  شراب: 'socks', شرابات: 'socks', جوارب: 'socks', شراريب: 'socks',
  كاب: 'cap', كابات: 'cap', طاقيه: 'cap', بيريه: 'cap',
  جزمه: 'shoes', جزم: 'shoes', حذاء: 'shoes', كوتشي: 'shoes', كوتشيات: 'shoes',
  شبشب: 'slippers', شباشب: 'slippers',
  شورت: 'shorts', شورتات: 'shorts',
  قميص: 'shirt', قمصان: 'shirt',
  جيبه: 'skirt', جيب: 'skirt', تنوره: 'skirt',
  شنطه: 'bag', شنط: 'bag', حقيبه: 'bag',
  روب: 'robe', بوكسر: 'boxer', بولو: 'polo', ليجن: 'leggings', ليجينج: 'leggings', ليقنز: 'leggings', طقم: 'set', اطقم: 'set',
  اسود: 'black', سودا: 'black', سوداء: 'black',
  ابيض: 'white', بيضا: 'white', بيضاء: 'white',
  كحلي: 'navy',
  رمادي: 'grey', رصاصي: 'grey',
  احمر: 'red', حمرا: 'red', حمراء: 'red', نبيتي: 'red',
  ازرق: 'blue', زرقا: 'blue', زرقاء: 'blue', لبني: 'blue',
  اخضر: 'green', خضرا: 'green', خضراء: 'green',
  بني: 'brown', بيج: 'beige',
  وردي: 'pink', بينك: 'pink', بمبي: 'pink',
  اصفر: 'yellow', صفرا: 'yellow', صفراء: 'yellow',
  برتقالي: 'orange', اورنج: 'orange',
  بنفسجي: 'purple', موف: 'purple',
  زيتي: 'olive',
  كريمي: 'cream', 'اوف وايت': 'cream',
  رجالي: 'men', رجال: 'men', ولادي: 'men',
  حريمي: 'women', نسائي: 'women', بناتي: 'women', ستاتي: 'women', حريم: 'women',
  اطفال: 'kids', اطفالي: 'kids', عيال: 'kids', بيبي: 'kids',
  واسع: 'wide', واسعه: 'wide', فضفاض: 'wide',
  'اوفر سايز': 'oversized', اوفرسايز: 'oversized', اوفر: 'oversized',
};

/** Clear Franco-Arabic / transliterated spellings (Latin letters). */
const FRANCO: Record<string, string> = {
  bantalon: 'pants', bantaloon: 'pants', bantalown: 'pants', bantalonat: 'pants',
  tishirt: 'tee', tshirt: 'tee', tishert: 'tee', teshirt: 'tee',
  hoodiz: 'hoodie', hoodiat: 'hoodie',
  gakit: 'jacket', gaket: 'jacket', jakit: 'jacket', gakitat: 'jacket',
  bigama: 'pjoys', bijama: 'pjoys', pijama: 'pjoys', pyjama: 'pjoys', pajama: 'pjoys', pajamas: 'pjoys', pyjamas: 'pjoys',
  gazma: 'shoes', shabshab: 'slippers', sharab: 'socks', shorrt: 'shorts', fostan: 'dress', kamis: 'shirt', shanta: 'bag',
};

/** Words that carry no product meaning in a shopping query ("I want", "size", "please"…). */
const STOP = new Set(['عايز', 'عاوز', 'عايزه', 'عاوزه', 'ابغي', 'اريد', 'محتاج', 'محتاجه', 'لو', 'سمحت', 'في', 'من', 'او', 'و', 'مع', 'لون', 'مقاس', 'سايز', 'حاجه', 'حلو', 'حلوه', 'جميل', 'جديد', 'جديده', 'ده', 'دي', 'size']);

const SIZE = /^(xxs|xs|s|m|l|xl|xxl|xxxl|2xl|3xl|4xl)$/i;

const ARABIC = /[\u0600-\u06ff]/;

/**
 * Arabic text → one canonical spelling, conservatively: diacritics and tatweel
 * removed; أ إ آ ٱ → ا; ى → ي; ة → ه; ؤ → و; ئ → ي; Arabic/Persian digits → 0-9;
 * every Unicode space (and the invisible bidi / zero-width marks) → one space.
 * Latin is lowercased. Nothing else is rewritten.
 */
export function normalizeArabic(input: string): string {
  return input
    .normalize('NFC')
    .replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, '')
    .replace(/[\u064b-\u065f\u0670\u06d6-\u06ed]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[\u0623\u0625\u0622\u0671]/g, '\u0627')
    .replace(/\u0649/g, '\u064a')
    .replace(/\u0629/g, '\u0647')
    .replace(/\u0624/g, '\u0648')
    .replace(/\u0626/g, '\u064a')
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\s\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Keys normalised once, so the lexicon itself can be written in any common spelling. */
const AR_NORM = new Map(Object.entries(AR).map(([k, v]) => [normalizeArabic(k.replace(/_/g, ' ')), v]));

const lookupArabic = (w: string): string | undefined => {
  const direct = AR_NORM.get(w);
  if (direct) return direct;
  // ال / وال / بال prefix ("الهودي", "والبنطلون")
  const bare = w.replace(/^(و|ب|ف)?ال/, '');
  if (bare !== w && bare.length >= 2) return AR_NORM.get(bare);
  return undefined;
};

export interface Understood {
  /** concept ids, at most one entry per id, in query order */
  concepts: string[];
  /** requested size label, e.g. "L" (matched against real available sizes) */
  size: string | null;
  /** Latin words that aren't concepts (still required as plain text, e.g. "cairo") */
  words: string[];
  /** Arabic words the lexicon doesn't know (ignored for matching, never guessed) */
  unknown: string[];
}

/** True when the bridge should run: Arabic letters, or a known Franco word. English stays on the original search. */
export function needsBridge(q: string): boolean {
  if (ARABIC.test(q)) return true;
  return normalizeArabic(q)
    .split(/[\s,./-]+/)
    .some((t) => t in FRANCO);
}

/** Query → concepts (phrases first, then words). Pure. */
export function understand(q: string): Understood {
  const tokens = normalizeArabic(q)
    .split(/[\s,،؛;/|+]+/)
    .filter(Boolean);
  const out: Understood = { concepts: [], size: null, words: [], unknown: [] };
  const add = (c: string) => !out.concepts.includes(c) && out.concepts.push(c);
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    const pair = i + 1 < tokens.length ? `${t} ${tokens[i + 1]}` : null;
    const phrase = pair ? AR_NORM.get(pair) : undefined;
    if (phrase) {
      add(phrase);
      i++;
      continue;
    }
    if (SIZE.test(t)) {
      out.size = t.toUpperCase();
      continue;
    }
    if (STOP.has(t)) continue;
    if (ARABIC.test(t)) {
      const c = lookupArabic(t);
      if (c) add(c);
      else out.unknown.push(t);
      continue;
    }
    const latin = t.replace(/[^a-z0-9&-]/g, '');
    if (!latin) continue;
    const f = FRANCO[latin] ?? (latin in CONCEPTS ? latin : undefined) ?? ENGLISH[latin];
    if (f) add(f);
    else if (latin.length >= 2) out.words.push(latin);
  }
  return out;
}

/** English concept words that may appear next to Arabic ("هودي black"). */
const ENGLISH: Record<string, string> = {
  hoodies: 'hoodie', tees: 'tee', 't-shirt': 'tee', 't-shirts': 'tee', trousers: 'pants', jean: 'jeans', jackets: 'jacket', dresses: 'dress',
  sock: 'socks', caps: 'cap', hat: 'cap', shoe: 'shoes', sneakers: 'shoes', gray: 'grey', woman: 'women', man: 'men', kid: 'kids', loose: 'wide', baggy: 'wide',
};

/** Lowercased searchable text for a product (title + type + collection titles + tags). */
export const productText = (cat: Catalogue, p: Product) =>
  [p.title, p.productType ?? '', p.collections.map((h) => cat.collections.get(h)?.title ?? h.replace(/-/g, ' ')).join(' '), p.tags].join(' ').toLowerCase();

/**
 * Structured match: a product must satisfy every concept GROUP the shopper
 * named (any concept within a group), the requested size (really available),
 * and any extra Latin words as plain text. Ranked by how much of it is in the
 * title, then in stock first, then IYS's own catalogue order.
 */
export function bridgeSearch(cat: Catalogue, u: Understood, texts: Map<Product, string>): Product[] {
  const groups = new Map<Group, RegExp[]>();
  for (const id of u.concepts) {
    const c = CONCEPTS[id];
    if (c) groups.set(c.group, [...(groups.get(c.group) ?? []), c.match]);
  }
  if (!groups.size && !u.words.length && !u.size) return [];
  const scored: { p: Product; score: number }[] = [];
  for (const p of cat.products) {
    const text = texts.get(p) ?? productText(cat, p);
    const title = p.title.toLowerCase();
    let ok = true;
    let score = 0;
    for (const res of groups.values()) {
      if (!res.some((re) => re.test(text))) {
        ok = false;
        break;
      }
      if (res.some((re) => re.test(title))) score += 2;
    }
    if (!ok) continue;
    if (u.words.some((w) => !text.includes(w))) continue;
    if (u.size && !p.sizes.some((s) => s.available && s.label.toUpperCase() === u.size)) continue;
    score += u.words.filter((w) => title.includes(w)).length;
    if (p.available === true) score += 0.5;
    scored.push({ p, score });
  }
  return scored.sort((a, b) => b.score - a.score || a.p.index - b.p.index).map((s) => s.p);
}

/** What the shopper sees back, e.g. ["hoodie", "black", "size L"]. */
export function explain(u: Understood): string[] {
  return [...u.concepts.map((c) => CONCEPTS[c]?.label ?? c), ...u.words, ...(u.size ? [`size ${u.size}`] : [])];
}

/** One spelling per normalised Arabic key (the first one written in AR), shown back when completing. */
const AR_SPELLING = new Map<string, string>();
for (const k of Object.keys(AR)) {
  const n = normalizeArabic(k.replace(/_/g, ' '));
  if (!AR_SPELLING.has(n)) AR_SPELLING.set(n, k.replace(/_/g, ' '));
}

/** True when a single typed word (or two-word phrase) is already a word this lexicon knows. */
export function isKnownWord(w: string): boolean {
  const n = normalizeArabic(w);
  if (ARABIC.test(n)) return Boolean(lookupArabic(n) ?? AR_NORM.get(n));
  return n in FRANCO || n in CONCEPTS || n in ENGLISH;
}

/**
 * Autocomplete for the lexicon: the words that start with `prefix` (Arabic,
 * with or without ال / وال / بال; or Latin: Franco, concept and English words),
 * one per concept, in lexicon order, never the prefix itself. Pure, static
 * data only: e.g. "هود" → هودي (hoodie), "bant" → bantalon (pants).
 */
export function completeWord(prefix: string, limit = 3): { word: string; concept: string }[] {
  const p = normalizeArabic(prefix);
  if (!p) return [];
  const out: { word: string; concept: string }[] = [];
  const seen = new Set<string>();
  const push = (word: string, concept: string) => {
    if (out.length >= limit || seen.has(concept) || normalizeArabic(word) === p) return;
    seen.add(concept);
    out.push({ word, concept });
  };
  if (ARABIC.test(p)) {
    const article = /^((?:و|ب|ف)?ال)(.+)$/.exec(p);
    for (const [bare, art] of [[p, ''], ...(article ? [[article[2]!, article[1]!]] : [])] as [string, string][]) {
      for (const [n, concept] of AR_NORM) if (n.startsWith(bare)) push(art + (AR_SPELLING.get(n) ?? n), concept);
    }
    return out;
  }
  if (p.length < 2) return out;
  for (const dict of [ENGLISH_CONCEPTS, FRANCO, ENGLISH] as Record<string, string>[]) for (const [w, concept] of Object.entries(dict)) if (w.startsWith(p)) push(w, concept);
  return out;
}

/** Concept ids as their own English words ("hoodie", "black", …), for completing Latin words. */
const ENGLISH_CONCEPTS: Record<string, string> = Object.fromEntries(Object.keys(CONCEPTS).map((id) => [id, id]));
