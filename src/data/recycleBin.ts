/**
 * What the Recycle Bin holds next to the empty BORING_OUTFITS joke: a chain of folders the
 * visitor is begged not to open, ending in a personal photo supplied by the project owner.
 */
export interface BinPhoto {
  kind: 'photo';
  id: string;
  title: string;
  alt: string;
  src: string;
  thumb: string;
  width: number;
  height: number;
}

export interface BinFolder {
  kind: 'folder';
  name: string;
  items: BinItem[];
}

export type BinItem = BinFolder | BinPhoto;

export const AMR_THROWBACK: BinPhoto = {
  kind: 'photo',
  id: 'amr-throwback',
  title: 'Amr Throwback',
  alt: 'Amr Throwback: an old photo of Amr in glasses and a purple striped shirt',
  src: '/iys/recycle/amr-throwback.webp',
  thumb: '/iys/recycle/amr-throwback-thumb.webp',
  width: 960,
  height: 1280,
};

const folder = (name: string, ...items: BinItem[]): BinFolder => ({ kind: 'folder', name, items });

/** RECYCLE BIN › Not Important › Really Not Important › DONT OPEN › Please › Amr Throwback */
export const RECYCLE_BIN: BinItem[] = [folder('Not Important', folder('Really Not Important', folder('DONT OPEN', folder('Please', AMR_THROWBACK))))];
