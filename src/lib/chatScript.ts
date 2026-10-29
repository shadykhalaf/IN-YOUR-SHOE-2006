import { assets, curation, localImage, pick } from '../data/assets';
import { concept } from '../data/copy';
import { BUDDIES } from '../data/taxonomy';
import { collectionProducts } from './catalogue/hydrate';
import { decorativeFilename } from './catalogue/format';
import type { Catalogue, Product } from './catalogue/types';

export type ChatEvent =
  | { t: 'system'; text: string; delay: number }
  | { t: 'msg'; from: 'buddy' | 'me'; text: string; lang?: string; note?: string; delay: number }
  | { t: 'file'; product: Product; image: string; local: boolean; filename: string; delay: number }
  | { t: 'tiles'; tiles: { src: string; title: string; sourceUrl: string; handle: string }[]; delay: number };

/**
 * Scripted CONCEPT conversation. Every attachment is a real product from the
 * snapshot (local curated photo when available, else its official CDN image).
 * No generated replies, no bot, no fake customers.
 */
export function chatScript(buddyId: string, cat: Catalogue): ChatEvent[] {
  const buddy = BUDDIES.find((b) => b.id === buddyId);
  if (!buddy) return [];
  const products = buddyId === 'pjoys' ? pick(cat, curation.pjoysMessenger) : buddyId === 'cairo' ? pick(cat, curation.cairo) : collectionProducts(cat, buddy.collection).slice(0, 6);
  const files: ChatEvent[] = products.map((p, i) => {
    const li = localImage(p.handle);
    return { t: 'file', product: p, image: li?.src ?? p.image ?? '', local: Boolean(li), filename: decorativeFilename(p.title), delay: i === 0 ? 900 : 520 };
  });
  const count = cat.collections.get(buddy.collection)?.count ?? products.length;

  if (buddyId === 'pjoys') {
    return [
      { t: 'system', text: concept.messenger.pjoysSignIn, delay: 0 },
      { t: 'msg', from: 'buddy', text: concept.messenger.pjoysOpener, delay: 500 },
      { t: 'msg', from: 'buddy', text: concept.messenger.pjoysFranco, lang: 'ar-Latn', note: 'Franco-Arabic: “are you awake?”', delay: 900 },
      { t: 'msg', from: 'buddy', text: concept.messenger.pjoysAfter[0]!, delay: 1100 },
      ...files,
      {
        t: 'tiles',
        tiles: assets.tiles.map((x) => ({ src: x.src, title: x.title, sourceUrl: x.sourceUrl, handle: x.handle })),
        delay: 800,
      },
      { t: 'msg', from: 'buddy', text: concept.messenger.pjoysWallpapers, delay: 200 },
      { t: 'msg', from: 'buddy', text: concept.messenger.pjoysOutro(count), delay: 900 },
    ];
  }
  return [
    { t: 'system', text: concept.messenger.buddyStatus(buddy.name, buddy.status), delay: 0 },
    { t: 'msg', from: 'buddy', text: buddy.opener, delay: 500 },
    ...files,
    { t: 'msg', from: 'buddy', text: concept.messenger.buddyOutro(products.length, count), delay: 700 },
  ];
}
