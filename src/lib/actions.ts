import { concept } from '../data/copy';
import { useOS } from '../state/os';
import { usePreferences, type WallpaperMode } from '../state/preferences';
import { play } from './sound';

export interface ViewerImage {
  src: string;
  /** Larger source for zoom (CDN width param or local file). */
  full?: string;
  title: string;
  /** Decorative camera-style filename — NOT product metadata. */
  filename?: string;
  alt: string;
  sourceUrl?: string;
  productHandle?: string;
  width?: number | null;
  height?: number | null;
}

export function openViewer(images: ViewerImage[], index = 0, opts: { title?: string } = {}) {
  const first = images[index];
  useOS.getState().open('viewer', {
    props: { images, index, key: Date.now() },
    title: `${opts.title ?? first?.filename ?? first?.title ?? 'Image'} - IYS IMAGE VIEWER`,
  });
}

/** A newly chosen photo always starts in Stretch (= full-desktop cover, no distortion); patterns pass 'tile'. */
export function setWallpaperImage(img: { src: string; title: string; sourceUrl?: string }, mode: WallpaperMode = 'stretch') {
  usePreferences.getState().setWallpaper({ kind: 'image', src: img.src, title: img.title, sourceUrl: img.sourceUrl }, mode);
  useOS.getState().notify(concept.wallpaperUpdated);
  play('done');
}
