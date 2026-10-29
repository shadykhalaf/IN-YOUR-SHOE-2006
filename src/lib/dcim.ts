import { assets } from '../data/assets';
import { officialSources } from '../data/copy';
import type { ViewerImage } from './actions';

export interface Photo extends ViewerImage {
  folder: string;
}

/** Real public IYS photography only — campaign banners, store photos, product lifestyle shots. */
export function dcim(): Record<string, Photo[]> {
  let n = 0;
  const name = () => `IMG_${String(++n).padStart(4, '0')}.JPG`;
  const campaigns: Photo[] = assets.campaign.map((c) => ({ folder: 'CAMPAIGNS', src: c.src, full: c.src, title: `${c.title} (current IYS campaign)`, filename: name(), alt: c.title, sourceUrl: c.sourceUrl, width: c.width, height: c.height }));
  const stores: Photo[] = assets.stores.map((s) => ({ folder: 'STORES', src: s.src, full: s.src, title: `IN YOUR SHOE - ${s.name}`, filename: name(), alt: `In Your Shoe store at ${s.name}`, sourceUrl: officialSources.stores, width: s.width, height: s.height }));
  const byFolder = (f: string): Photo[] =>
    assets.camera.filter((c) => c.folder === f).map((c) => ({ folder: f, src: c.src, full: c.src, title: c.title, filename: name(), alt: `${c.title} - official IYS product photo`, sourceUrl: c.sourceUrl, productHandle: c.handle, width: c.width, height: c.height }));
  return { CAMPAIGNS: campaigns, PJOYS: byFolder('PJOYS'), CAIRO: byFolder('CAIRO'), STORES: stores };
}
