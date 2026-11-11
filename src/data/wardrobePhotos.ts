/**
 * Personal photos pinned inside MY WARDROBE folders. They are not catalogue products:
 * no price, no product page, and the folder counts stay the catalogue's. Clicking one
 * opens it in IYS IMAGE VIEWER.
 */
export interface WardrobePhoto {
  id: string;
  /** The folder it sits in (a WARDROBE collection). */
  collection: string;
  /**
   * 1-based cell in the thumbnail grid on the folder's first page. The grid has as many
   * columns as the window is wide, so the tile's place in the list is worked out from that.
   */
  row: number;
  column: number;
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
    row: 3,
    column: 3,
    title: 'Amr Throwback',
    alt: 'Amr Throwback: an old photo of Amr in glasses and a purple striped shirt',
    src: '/iys/wardrobe/amr-throwback.webp',
    thumb: '/iys/wardrobe/amr-throwback-thumb.webp',
    width: 960,
    height: 1280,
  },
];

export type WardrobeEntry<T> = { kind: 'product'; product: T } | { kind: 'photo'; photo: WardrobePhoto };

/**
 * A grid cell's place in the tile list. Tiles fill each row left to right, so row 3,
 * column 3 is tile 11 in a 4-column grid. In a grid narrower than the column, the
 * tile takes the row's last cell.
 */
export const cellIndex = (row: number, column: number, columns: number) => (Math.max(row, 1) - 1) * columns + Math.min(Math.max(column, 1), columns) - 1;

/** A folder page's tiles: the products, with this folder's photos in their cells on page 1 only. */
export function withPhotos<T>(products: T[], collection: string, page: number, columns: number, photos: WardrobePhoto[] = WARDROBE_PHOTOS): WardrobeEntry<T>[] {
  const out: WardrobeEntry<T>[] = products.map((product) => ({ kind: 'product', product }));
  if (page !== 1) return out;
  const cols = Math.max(1, Math.floor(columns) || 1);
  const mine = photos
    .filter((p) => p.collection === collection)
    .map((photo) => ({ photo, at: cellIndex(photo.row, photo.column, cols) }))
    .sort((a, b) => a.at - b.at);
  for (const { photo, at } of mine) out.splice(Math.min(at, out.length), 0, { kind: 'photo', photo });
  return out;
}
