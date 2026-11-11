import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AMR_THROWBACK, RECYCLE_BIN, type BinItem } from '../data/recycleBin';
import { decorativeFilename } from '../lib/catalogue/format';

const root = resolve(__dirname, '../..');
/** Follows the one item at each level, listing folder names down to the photo. */
const chain = (items: BinItem[]): string[] => {
  expect(items).toHaveLength(1);
  const only = items[0]!;
  return only.kind === 'folder' ? [only.name, ...chain(only.items)] : [only.title];
};

describe('Recycle Bin', () => {
  it('Not Important › Really Not Important › DONT OPEN › Please › Amr Throwback', () => {
    expect(chain(RECYCLE_BIN)).toEqual(['Not Important', 'Really Not Important', 'DONT OPEN', 'Please', 'Amr Throwback']);
    expect(decorativeFilename(AMR_THROWBACK.title)).toBe('Amr_Throwback.jpg');
  });

  it('the photo ships as WEBP from public/iys/recycle', () => {
    for (const src of [AMR_THROWBACK.src, AMR_THROWBACK.thumb]) {
      expect(src.startsWith('/iys/recycle/'), src).toBe(true);
      const file = readFileSync(resolve(root, `public${src}`));
      expect(file.subarray(8, 12).toString(), src).toBe('WEBP');
      expect(file.length, src).toBeLessThan(200_000);
    }
  });
});
