import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { WARDROBE, type Folder } from '../data/taxonomy';
import { WARDROBE_PHOTOS, withPhotos, type WardrobePhoto } from '../data/wardrobePhotos';
import { decorativeFilename } from '../lib/catalogue/format';

const root = resolve(__dirname, '../..');
const products = ['a', 'b', 'c', 'd', 'e'];
const folders = (list: Folder[]): string[] => list.flatMap((f) => [f.collection, ...folders(f.children ?? [])]);
const amr = WARDROBE_PHOTOS.find((p) => p.id === 'amr-throwback')!;
const tiles = (collection: string, page = 1, list = products, photos?: WardrobePhoto[]) =>
  withPhotos(list, collection, page, photos).map((e) => (e.kind === 'photo' ? e.photo.title : e.product));

describe('MY WARDROBE photos', () => {
  it('Amr Throwback is the third tile in CREWNECKS', () => {
    expect(amr).toMatchObject({ collection: 'crewnecks', position: 3, title: 'Amr Throwback' });
    expect(decorativeFilename(amr.title)).toBe('Amr_Throwback.jpg');
    expect(tiles('crewnecks')).toEqual(['a', 'b', 'Amr Throwback', 'c', 'd', 'e']);
  });

  it('stays out of other folders and later pages', () => {
    expect(tiles('hoodies')).toEqual(products);
    expect(tiles('all-tops')).toEqual(products);
    expect(tiles('crewnecks', 2)).toEqual(products);
  });

  it('goes last when the folder has fewer tiles than its position', () => {
    expect(tiles('crewnecks', 1, ['a'])).toEqual(['a', 'Amr Throwback']);
    expect(tiles('crewnecks', 1, [])).toEqual(['Amr Throwback']);
  });

  it('places several photos by position', () => {
    const extra: WardrobePhoto = { ...amr, id: 'first', title: 'First', position: 1 };
    expect(tiles('crewnecks', 1, products, [amr, extra])).toEqual(['First', 'a', 'Amr Throwback', 'b', 'c', 'd', 'e']);
  });

  it('every photo sits in a real folder and its images ship as WEBP', () => {
    for (const p of WARDROBE_PHOTOS) {
      expect(folders(WARDROBE)).toContain(p.collection);
      for (const src of [p.src, p.thumb]) {
        const file = readFileSync(resolve(root, `public${src}`));
        expect(file.subarray(8, 12).toString(), src).toBe('WEBP');
        expect(file.length, src).toBeLessThan(200_000);
      }
    }
  });
});
