/**
 * Personal photos pinned inside MY WARDROBE folders. They are not catalogue products:
 * no price, no product page, and the folder counts stay the catalogue's. Clicking one
 * opens it in IYS IMAGE VIEWER.
 */
export interface WardrobePhoto {
  id: string;
  /** The folder it sits in (a WARDROBE collection). */
  collection: string;
  /** 1-based tile position on the folder's first page: 3 = first row, third column. */
  position: number;
  title: string;
  alt: string;
  src: string;
  thumb: string;
  width: number;
  height: number;
}

export const WARDROBE_PHOTOS: WardrobePhoto[] = [
  {
    id: 'amr-throwback',
    collection: 'crewnecks',
    position: 3,
    title: 'Amr Throwback',
    alt: 'Amr Throwback: an old photo of Amr in glasses and a purple striped shirt',
    src: '/iys/wardrobe/amr-throwback.webp',
    thumb: '/iys/wardrobe/amr-throwback-thumb.webp',
    width: 960,
    height: 1280,
  },
];

export type WardrobeEntry<T> = { kind: 'product'; product: T } | { kind: 'photo'; photo: WardrobePhoto };

/** A folder page's tiles: the products, with this folder's photos slotted in on page 1 only. */
export function withPhotos<T>(products: T[], collection: string, page: number, photos: WardrobePhoto[] = WARDROBE_PHOTOS): WardrobeEntry<T>[] {
  const out: WardrobeEntry<T>[] = products.map((product) => ({ kind: 'product', product }));
  if (page !== 1) return out;
  const mine = photos.filter((p) => p.collection === collection).sort((a, b) => a.position - b.position);
  for (const photo of mine) out.splice(Math.min(Math.max(photo.position - 1, 0), out.length), 0, { kind: 'photo', photo });
  return out;
}
