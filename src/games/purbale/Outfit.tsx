import { useId } from 'react';
import { CATCHY_URI } from '../shared/catchy';
import type { Slot } from './logic';
import { TILES } from './media';

/** Plain names for every closet piece (accessible labels + the target description). */
export const PIECE_NAME: Record<Slot, Record<string, string>> = {
  top: { cereal: 'Cereal Killer Pjoy top', matcha: 'Matcha Pjoy top', fluffy: 'Fluffy Pjoy top', stripe: 'Coral stripe tee', plaid: 'Green plaid shirt', hoodie: 'Sky hoodie' },
  bottom: { cereal: 'Cereal Killer Pjoy pants', matcha: 'Matcha Pjoy pants', denim: 'Denim jeans', shorts: 'Coral shorts', plaid: 'Navy plaid pants' },
  socks: { coral: 'Coral stripe socks', teal: 'Teal socks', yellow: 'Yellow socks', hearts: 'Pink heart socks', white: 'White socks' },
  extra: { cap: 'Cap', headphones: 'Headphones', scarf: 'Scarf', shades: 'Shades', bow: 'Bow' },
};

const INK = '#1b2b44';

/** SVG <pattern>s for one picture; ids are prefixed so several outfits can share a page. */
function Defs({ p }: { p: string }) {
  const img = (id: string, src: string | null, fallback: string) =>
    src ? (
      <pattern id={`${p}-${id}`} patternUnits="userSpaceOnUse" width="40" height="40">
        <image href={src} width="40" height="40" preserveAspectRatio="xMidYMid slice" />
      </pattern>
    ) : (
      <pattern id={`${p}-${id}`} patternUnits="userSpaceOnUse" width="10" height="10">
        <rect width="10" height="10" fill={fallback} />
      </pattern>
    );
  return (
    <defs>
      {img('cereal', TILES.cereal, '#ffd36b')}
      {img('matcha', TILES.matcha, '#b5d99c')}
      {img('fluffy', TILES.fluffy, '#ffc2d6')}
      <pattern id={`${p}-stripe`} patternUnits="userSpaceOnUse" width="10" height="10">
        <rect width="10" height="10" fill="#ff6060" />
        <rect width="10" height="4" fill="#fff" />
      </pattern>
      <pattern id={`${p}-plaid`} patternUnits="userSpaceOnUse" width="14" height="14">
        <rect width="14" height="14" fill="#2c9420" />
        <rect x="5" width="4" height="14" fill="#c9f2b8" opacity=".6" />
        <rect y="5" width="14" height="4" fill="#c9f2b8" opacity=".6" />
      </pattern>
      <pattern id={`${p}-navyplaid`} patternUnits="userSpaceOnUse" width="14" height="14">
        <rect width="14" height="14" fill="#1d3a6e" />
        <rect x="5" width="4" height="14" fill="#9fc0e8" opacity=".55" />
        <rect y="5" width="14" height="4" fill="#ff6060" opacity=".5" />
      </pattern>
      <pattern id={`${p}-hearts`} patternUnits="userSpaceOnUse" width="10" height="10">
        <rect width="10" height="10" fill="#ff9ec7" />
        <circle cx="5" cy="5" r="2" fill="#fff" />
      </pattern>
    </defs>
  );
}

const TOP_FILL: Record<string, (p: string) => string> = {
  cereal: (p) => `url(#${p}-cereal)`,
  matcha: (p) => `url(#${p}-matcha)`,
  fluffy: (p) => `url(#${p}-fluffy)`,
  stripe: (p) => `url(#${p}-stripe)`,
  plaid: (p) => `url(#${p}-plaid)`,
  hoodie: () => '#2f86e0',
};
const BOTTOM_FILL: Record<string, (p: string) => string> = {
  cereal: (p) => `url(#${p}-cereal)`,
  matcha: (p) => `url(#${p}-matcha)`,
  denim: () => '#3b5f8f',
  shorts: () => '#ff6060',
  plaid: (p) => `url(#${p}-navyplaid)`,
};
const SOCK_FILL: Record<string, (p: string) => string> = {
  coral: (p) => `url(#${p}-stripe)`,
  teal: () => '#4aab9a',
  yellow: () => '#f4c430',
  hearts: (p) => `url(#${p}-hearts)`,
  white: () => '#ffffff',
};

function Extra({ id }: { id: string }) {
  switch (id) {
    case 'cap':
      return <path d="M30 22 Q60 -4 90 22 L104 26 Q90 30 30 26 Z" fill="#06478e" stroke={INK} strokeWidth="2" />;
    case 'headphones':
      return (
        <g stroke={INK} strokeWidth="2">
          <path d="M22 44 Q60 -10 98 44" fill="none" strokeWidth="5" />
          <rect x="14" y="38" width="12" height="20" rx="4" fill="#ff6060" />
          <rect x="94" y="38" width="12" height="20" rx="4" fill="#ff6060" />
        </g>
      );
    case 'scarf':
      return (
        <g stroke={INK} strokeWidth="2">
          <rect x="34" y="68" width="52" height="12" rx="5" fill="#f4c430" />
          <rect x="70" y="74" width="12" height="28" rx="4" fill="#f4c430" />
        </g>
      );
    case 'shades':
      return (
        <g stroke={INK} strokeWidth="2">
          <rect x="28" y="30" width="26" height="16" rx="5" fill="#111" />
          <rect x="66" y="30" width="26" height="16" rx="5" fill="#111" />
          <path d="M54 37h12" />
        </g>
      );
    case 'bow':
      return <path d="M86 6 L104 0 L100 16 Z M86 6 L72 -2 L76 14 Z" fill="#ff9ec7" stroke={INK} strokeWidth="2" />;
    default:
      return null;
  }
}

/** Catchy wearing a look. Missing pieces = Catchy's plain teal body. */
export function Outfit({ look, size = 140, label }: { look: Partial<Record<Slot, string>>; size?: number; label: string }) {
  const p = useId().replace(/:/g, '');
  const top = look.top ? TOP_FILL[look.top]!(p) : '#4aab9a';
  const bottom = look.bottom ? BOTTOM_FILL[look.bottom]!(p) : '#3e9483';
  const socks = look.socks ? SOCK_FILL[look.socks]!(p) : '#4aab9a';
  const shorts = look.bottom === 'shorts';
  return (
    <svg viewBox="-4 -6 128 214" width={size * 0.6} height={size} role="img" aria-label={label} className="outfit">
      <Defs p={p} />
      {/* legs + socks + shoes */}
      <rect x="42" y="150" width="14" height="40" fill="#4aab9a" stroke={INK} strokeWidth="2" />
      <rect x="64" y="150" width="14" height="40" fill="#4aab9a" stroke={INK} strokeWidth="2" />
      <rect x="40" y="176" width="18" height="18" fill={socks} stroke={INK} strokeWidth="2" />
      <rect x="62" y="176" width="18" height="18" fill={socks} stroke={INK} strokeWidth="2" />
      <path d="M36 194h24v8H32z M60 194h24l4 8H60z" fill="#fff" stroke={INK} strokeWidth="2" />
      {/* bottoms */}
      <path d={shorts ? 'M38 120h44l2 34H62l-2-14-2 14H36z' : 'M38 120h44l2 60H62l-2-40-2 40H36z'} fill={bottom} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      {/* top */}
      <path d="M38 76 L20 86 L14 112 L28 116 L34 100 L36 128 H84 L86 100 L92 116 L106 112 L100 86 L82 76 Q60 86 38 76 Z" fill={top} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      {look.top === 'hoodie' && <path d="M46 108h28v14H46z" fill="none" stroke="#fff" strokeWidth="2" />}
      {/* head */}
      <image href={CATCHY_URI} x="12" y="-2" width="96" height="90" />
      {look.extra && <Extra id={look.extra} />}
    </svg>
  );
}

/** Small swatch for an option button. */
export function Swatch({ slot, id }: { slot: Slot; id: string }) {
  const p = useId().replace(/:/g, '');
  const fill = slot === 'top' ? TOP_FILL[id]?.(p) : slot === 'bottom' ? BOTTOM_FILL[id]?.(p) : slot === 'socks' ? SOCK_FILL[id]?.(p) : null;
  return (
    <svg viewBox={slot === 'extra' ? '0 -6 120 90' : '0 0 30 30'} width="30" height="30" aria-hidden="true" className="swatch">
      <Defs p={p} />
      {fill ? <rect x="1" y="1" width="28" height="28" rx="5" fill={fill} stroke={INK} strokeWidth="1.5" /> : <Extra id={id} />}
    </svg>
  );
}
