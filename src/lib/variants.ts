import type { ProductDetail } from './catalogue/types';

type Variant = ProductDetail['variants'][number];

/** Find the variant matching every selected option value (null = any). */
export function findVariant(p: ProductDetail, selected: (string | null)[]): Variant | null {
  if (!p.options.length) return p.variants[0] ?? null;
  if (selected.some((s) => s === null)) return null;
  return p.variants.find((v) => p.options.every((_, i) => v.options[i] === selected[i])) ?? null;
}

/** Is an option value purchasable given the other current selections? */
export function valueAvailable(p: ProductDetail, optionIndex: number, value: string, selected: (string | null)[]): boolean | null {
  const matches = p.variants.filter((v) => v.options[optionIndex] === value && p.options.every((_, i) => i === optionIndex || selected[i] === null || v.options[i] === selected[i]));
  if (!matches.length) return false;
  if (matches.some((v) => v.available === true)) return true;
  if (matches.every((v) => v.available === false)) return false;
  return null;
}

/**
 * Initial selection: single-value options are preselected; for the rest,
 * nothing is chosen until the user picks (no silent default size).
 */
export function initialSelection(p: ProductDetail): (string | null)[] {
  return p.options.map((o) => (o.values.length === 1 ? o.values[0]! : null));
}

export function variantLabel(p: ProductDetail, v: Variant | null): string | null {
  if (!v || !p.options.length) return null;
  return v.options.filter(Boolean).join(' / ');
}
