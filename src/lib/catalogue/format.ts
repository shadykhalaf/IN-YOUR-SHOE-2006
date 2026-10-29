const egp = new Intl.NumberFormat('en-EG', { maximumFractionDigits: 2, minimumFractionDigits: 0 });

/** 999 → "999 EGP", 1299.5 → "1,299.5 EGP". Never converts currency. */
export function formatEGP(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'Price unavailable';
  return `${egp.format(value)} EGP`;
}

export const formatCount = (n: number) => new Intl.NumberFormat('en-US').format(n);

/** Decorative 8.3-style filename for explorer views. NOT product metadata. */
export function decorativeFilename(title: string, ext = 'jpg'): string {
  const words = title
    .replace(/['’]/g, '')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1).toLowerCase());
  const base = words.join('_').slice(0, 40) || 'Item';
  return `${base}.${ext}`;
}

export const plural = (n: number, one: string, many = `${one}s`) => `${formatCount(n)} ${n === 1 ? one : many}`;

/**
 * Display-time normalisation: the concept shows no em dashes (U+2014), so any
 * that arrive in synced/generated data are rendered as " - ". Source data files
 * are left exactly as synced.
 */
export const noEmDash = (s: string) => s.replace(/\s*\u2014\s*/g, ' - ');
