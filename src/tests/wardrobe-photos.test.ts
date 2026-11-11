import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { WARDROBE, type Folder } from '../data/taxonomy';
import { cellIndex, WARDROBE_PHOTOS, withPhotos, type WardrobePhoto } from '../data/wardrobePhotos';
import { decorativeFilename } from '../lib/catalogue/format';

const root = resolve(__dirname, '../..');
const thirty = Array.from({ length: 30 }, (_, i) => `p${i + 1}`);
const folders = (list: Folder[]): string[] => list.flatMap((f) => [f.collection, ...folders(f.children ?? [])]);
const amr = WARDROBE_PHOTOS.find((p) => p.id === 'amr-throwback')!;
const tiles = (collection: string, page: number, columns: number, list = thirty, photos?: WardrobePhoto[]) =>
  withPhotos(list, collection, page, columns, photos).map((e) => (e.kind === 'photo' ? e.photo.title : e.product));
/** Where a tile shows up in a grid that fills each row left to right. */
const cellOf = (i: number, columns: number) => ({ row: Math.floor(i / columns) + 1, column: (i % columns) + 1 });

describe('MY WARDROBE photos', () => {
  it('Amr Throwback sits in row 3, column 3 of CREWNECKS at any grid width', () => {
    expect(amr).toMatchObject({ collection: 'crewnecks', row: 3, column: 3, title: 'Amr Throwback' });
    expect(decorativeFilename(amr.title)).toBe('Amr_Throwback.jpg');
    for (const columns of [3, 4, 5, 6, 9]) {
      const t = tiles('crewnecks', 1, columns);
      expect(t, `${columns} columns`).toHaveLength(31);
      expect(cellOf(t.indexOf('Amr Throwback'), columns), `${columns} columns`).toEqual({ row: 3, column: 3 });
    }
    // the default window's 4-column grid: tile 11, after p1–p10
    expect(tiles('crewnecks', 1, 4).slice(8, 12)).toEqual(['p9', 'p10', 'Amr Throwback', 'p11']);
  });

  it('a grid narrower than the column puts it in the last cell of that row', () => {
    expect(cellIndex(3, 3, 2)).toBe(5);
    expect(cellOf(tiles('crewnecks', 1, 2).indexOf('Amr Throwback'), 2)).toEqual({ row: 3, column: 2 });
    expect(cellOf(tiles('crewnecks', 1, 1).indexOf('Amr Throwback'), 1)).toEqual({ row: 3, column: 1 });
  });

  it('stays out of other folders and later pages', () => {
    expect(tiles('hoodies', 1, 4)).toEqual(thirty);
    expect(tiles('all-tops', 1, 4)).toEqual(thirty);
    expect(tiles('crewnecks', 2, 4)).toEqual(thirty);
  });

  it('goes last when the folder is too small to reach its cell', () => {
    expect(tiles('crewnecks', 1, 4, ['a', 'b'])).toEqual(['a', 'b', 'Amr Throwback']);
    expect(tiles('crewnecks', 1, 4, [])).toEqual(['Amr Throwback']);
  });

  it('places several photos by cell', () => {
    const first: WardrobePhoto = { ...amr, id: 'first', title: 'First', row: 1, column: 1 };
    const t = tiles('crewnecks', 1, 4, thirty, [amr, first]);
    expect(t[0]).toBe('First');
    expect(cellOf(t.indexOf('Amr Throwback'), 4)).toEqual({ row: 3, column: 3 });
    expect(t).toHaveLength(32);
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
