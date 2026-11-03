import { describe, expect, it } from 'vitest';
import { mergeCollections, storeMenu, type StoreHome, type StoreMenuNode } from '../lib/storeHome';
import type { Catalogue } from '../lib/catalogue/types';

const node = (title: string, url: string, collection: string | null, items: StoreMenuNode[] = []): StoreMenuNode => ({ title, url, collection, items });

describe('store menu', () => {
  it('follows the store: top-level entries, their own collection or their first child, Shop all to /shop', () => {
    const m = storeMenu([
      node('New', '/collections/newest', 'newest'),
      node('Tops', '#', null, [node('Hoodies', '/collections/hoodies', 'hoodies')]),
      node('About', '/pages/about', null),
      node('Shop all', '/collections/all', 'all'),
    ]);
    expect(m).toEqual([
      { label: 'NEW', collection: 'newest' },
      { label: 'TOPS', collection: 'hoodies' },
      { label: 'SHOP ALL', collection: null, to: '/shop' },
    ]);
  });
});

describe('new store collections', () => {
  it('are added from products this site has, in the store order, without touching existing ones', () => {
    const cat = { products: [{ handle: 'a' }, { handle: 'b' }, { handle: 'c' }], collections: new Map([['newest', { handle: 'newest', title: 'NEW', count: 1, order: [0] }]]) } as unknown as Catalogue;
    const home = { theme: 't', menu: [], sections: [], collections: {
      winter: { title: 'Winter', count: 9, image: null, products: ['c', 'zzz', 'a'] },
      newest: { title: 'X', count: 99, image: null, products: ['b'] },
      empty: { title: 'E', count: 3, image: null, products: ['nope'] },
    } } as StoreHome;
    mergeCollections(cat, home);
    expect(cat.collections.get('winter')).toEqual({ handle: 'winter', title: 'Winter', count: 2, order: [2, 0] });
    expect(cat.collections.get('newest')?.order).toEqual([0]);
    expect(cat.collections.has('empty')).toBe(false);
  });
});
