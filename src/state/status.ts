import { create } from 'zustand';
import type { Product, ProductDetail } from '../lib/catalogue/types';
import { play } from '../lib/sound';
import { useCart } from './cart';

/** IYS INTERNET status bar — replaces toast spam. */
interface BrowserStatus {
  text: string;
  busy: boolean;
  set: (text: string, busy?: boolean) => void;
}
export const useBrowserStatus = create<BrowserStatus>()((set) => ({
  text: 'Done.',
  busy: false,
  set: (text, busy = false) => set({ text, busy }),
}));

/** "COPYING ITEM TO: MY BAG" transfer dialog. */
interface Transfer {
  item: { title: string; image: string | null; variant: string | null } | null;
  at: number;
  start: (item: Transfer['item']) => void;
  done: () => void;
}
export const useTransfer = create<Transfer>()((set) => ({
  item: null,
  at: 0,
  start: (item) => set({ item, at: Date.now() }),
  done: () => set({ item: null }),
}));

export interface AddRequest {
  handle: string;
  title: string;
  variantId: number | null;
  variantTitle: string | null;
  size: string | null;
  price: number;
  image: string | null;
}

/** One add-to-bag path for every surface (card, product page, mobile). */
export function addToBag(req: AddRequest, qty = 1) {
  useCart.getState().add(req, qty);
  useTransfer.getState().start({ title: req.title, image: req.image, variant: req.variantTitle });
  useBrowserStatus.getState().set('Item added.');
  play('done');
}

/** Build a request from an index product + chosen size row (quick add). */
export function quickRequest(p: Product, size?: { label: string; variantId: number | null; price: number | null } | null): AddRequest | null {
  if (size && size.variantId) {
    return { handle: p.handle, title: p.title, variantId: size.variantId, variantTitle: size.label, size: size.label, price: size.price ?? p.price ?? 0, image: p.image };
  }
  if (p.quickVariant && p.price !== null) {
    return { handle: p.handle, title: p.title, variantId: p.quickVariant.id, variantTitle: null, size: null, price: p.price, image: p.image };
  }
  return null;
}

/** Build a request from the full product + a resolved variant. */
export function detailRequest(p: ProductDetail, variant: ProductDetail['variants'][number]): AddRequest | null {
  if (variant.price === null) return null;
  const sizeIdx = p.sizeOption ? p.options.findIndex((o) => o.name === p.sizeOption) : -1;
  const title = variant.title && variant.title !== 'Default Title' ? variant.title : null;
  return {
    handle: p.handle,
    title: p.title,
    variantId: variant.id,
    variantTitle: title,
    size: sizeIdx >= 0 ? variant.options[sizeIdx] ?? null : null,
    price: variant.price,
    image: p.images.find((i) => i.id !== null && i.id === variant.imageId)?.src ?? p.images[0]?.src ?? null,
  };
}
