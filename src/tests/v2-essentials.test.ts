import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ESSENTIALS, HELP_PAGES, POLICIES, essential } from '../data/essentials';

const root = resolve(__dirname, '../..');

describe('IYS ESSENTIALS - one source of truth', () => {
  it('contains the five official policies with their canonical URLs', () => {
    expect(POLICIES.map((p) => [p.id, p.url])).toEqual([
      ['exchange-refund', 'https://inyourshoe.com/pages/exchange-refund-policy'],
      ['shipping', 'https://inyourshoe.com/pages/shipping-policy'],
      ['terms-conditions', 'https://inyourshoe.com/pages/terms-conditions'],
      ['terms-of-service', 'https://inyourshoe.com/policies/terms-of-service'],
      ['privacy', 'https://inyourshoe.com/pages/privacy-policy'],
    ]);
    expect(HELP_PAGES.map((p) => p.id)).toEqual(['faqs', 'track-order', 'contact']);
  });
  it('every link is an official https://inyourshoe.com/ page, unique', () => {
    for (const e of ESSENTIALS) expect(e.url).toMatch(/^https:\/\/inyourshoe\.com\/(pages|policies)\/[a-z-]+$/);
    expect(new Set(ESSENTIALS.map((e) => e.url)).size).toBe(ESSENTIALS.length);
    expect(() => essential('nope')).toThrow();
  });
  it('policy URLs are not duplicated elsewhere in the source (single source of truth)', () => {
    const files = ['src/apps/Browser/pages/Home.tsx', 'src/apps/Browser/pages/Product.tsx', 'src/apps/Bag/Bag.tsx', 'src/apps/Small/Exchange.tsx', 'src/shells/mobile/overlays.tsx', 'src/shells/mobile/screens.tsx', 'src/components/os/StartMenu.tsx', 'src/apps/Browser/Browser.tsx'];
    for (const f of files) {
      const s = readFileSync(resolve(root, f), 'utf8');
      expect(s, f).not.toMatch(/inyourshoe\.com\/(pages\/(exchange-refund|shipping|terms|privacy)|policies\/)/);
    }
  });
});
