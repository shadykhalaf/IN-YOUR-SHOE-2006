import { assets, brand } from '../../data/assets';
import { CATCHY_URI } from '../shared/catchy';

/** Real local IYS imagery (no prices, no product claims): first photo of a product in the local manifest. */
const photo = (handle: string) => assets.products[handle]?.images[0]?.src ?? null;
const tile = (handle: string) => assets.tiles.find((t) => t.handle === handle)?.src ?? null;

export const TILES = { cereal: tile('cereal-killer-pjoys'), matcha: tile('love-you-so-matcha-pjoys'), fluffy: tile('dont-go-out-fluffy-pjoys') };

/** PJOY PAIRS pictures: every local Pjoy photo, the neck socks, the three Pjoy prints, Catchy and the IYS mark. */
export function pairPictures(): Record<string, { src: string; alt: string }> {
  const out: Record<string, { src: string; alt: string }> = {};
  for (const [h, p] of Object.entries(assets.products)) {
    if (!/pjoys|socks/.test(h)) continue;
    const src = photo(h);
    if (src) out[h] = { src, alt: p.title };
  }
  for (const t of assets.tiles) out[`print:${t.handle}`] = { src: t.src, alt: `${t.title} print` };
  out.catchy = { src: CATCHY_URI, alt: 'Catchy' };
  out.iys = { src: brand.mark, alt: 'IYS logo' };
  return out;
}

/** PACK THE DROP shelf items: generic piece types shown with a real local IYS photo. */
export const PACK_ITEMS: { id: string; label: string; src: string | null }[] = [
  { id: 'pjoys', label: 'PJOYS', src: photo('cereal-killer-pjoys') },
  { id: 'socks', label: 'NECK SOCKS', src: photo('i-love-cairo-neck-socks') },
  { id: 'cap', label: 'CAP', src: photo('masr-washed-cap') },
  { id: 'hoodie', label: 'HOODIE', src: photo('dropout-oversized-hoodie') },
  { id: 'tee', label: 'TEE', src: photo('heliopolis-regular-tee') },
  { id: 'jeans', label: 'JEANS', src: photo('female-denim-blue-washed-wide-leg-jeans') },
  { id: 'sleeve', label: 'LAPTOP SLEEVE', src: photo('blue-checkered-laptop-sleeve') },
  { id: 'jersey', label: 'JERSEY', src: photo('kairo-pop-jersey') },
];
