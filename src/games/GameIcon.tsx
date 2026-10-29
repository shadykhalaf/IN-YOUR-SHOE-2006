import type { JSX } from 'react';
import { CATCHY_URI } from './shared/catchy';
import type { GameId } from './registry';

/** Original 56px folder icons for the six IYS GAMES (SVG, nothing traced). */
const O = '#1b2b44';
const art: Record<GameId, JSX.Element> = {
  purbale: (
    <>
      <rect x="6" y="8" width="44" height="42" rx="3" fill="#c98a52" stroke={O} strokeWidth="1.5" />
      <rect x="10" y="12" width="17" height="34" fill="#e8b47f" stroke={O} />
      <rect x="29" y="12" width="17" height="34" fill="#e8b47f" stroke={O} />
      <circle cx="25" cy="30" r="1.6" fill={O} />
      <circle cx="31" cy="30" r="1.6" fill={O} />
      <path d="M8 50h40" stroke={O} strokeWidth="2" />
      <image href={CATCHY_URI} x="20" y="22" width="30" height="28" />
    </>
  ),
  tower: (
    <>
      <rect x="4" y="4" width="48" height="48" rx="4" fill="#7fc0f7" stroke={O} strokeWidth="1.5" />
      <rect x="8" y="42" width="20" height="5" rx="2" fill="#ff6060" stroke={O} />
      <rect x="26" y="30" width="18" height="5" rx="2" fill="#f4c430" stroke={O} />
      <rect x="10" y="17" width="18" height="5" rx="2" fill="#2fbf4a" stroke={O} />
      <path d="M44 12l2 4 4 1-4 1-2 4-2-4-4-1 4-1z" fill="#fff" />
      <image href={CATCHY_URI} x="26" y="12" width="18" height="17" />
    </>
  ),
  chomp: (
    <>
      <rect x="4" y="4" width="48" height="48" rx="4" fill="#0b2f5e" stroke={O} strokeWidth="1.5" />
      <path d="M10 14h36M10 14v28M46 14v10M22 26h24M22 26v16M34 38h12" stroke="#4b87c8" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M38 42l3-3 3 3v4h-6z" fill="#ff6060" stroke="#fff" strokeWidth=".8" />
      <circle cx="16" cy="20" r="1.8" fill="#f4c430" />
      <circle cx="28" cy="20" r="1.8" fill="#f4c430" />
      <image href={CATCHY_URI} x="25" y="29" width="16" height="15" />
    </>
  ),
  stacks: (
    <>
      <rect x="4" y="4" width="48" height="48" rx="4" fill="#e3f2ff" stroke={O} strokeWidth="1.5" />
      <g stroke={O}>
        <rect x="10" y="40" width="9" height="9" fill="#ff6060" />
        <rect x="19" y="40" width="9" height="9" fill="#ff6060" />
        <rect x="28" y="40" width="9" height="9" fill="#3b5f8f" />
        <rect x="37" y="40" width="9" height="9" fill="#3b5f8f" />
        <rect x="10" y="31" width="9" height="9" fill="#f4c430" />
        <rect x="37" y="31" width="9" height="9" fill="#3b5f8f" />
        <rect x="19" y="10" width="9" height="9" fill="#ff9ec7" />
        <rect x="28" y="10" width="9" height="9" fill="#ff9ec7" />
        <rect x="28" y="19" width="9" height="9" fill="#ff9ec7" />
        <rect x="37" y="19" width="9" height="9" fill="#ff9ec7" />
      </g>
      <path d="M10 43h18M10 46h18" stroke="#fff" strokeWidth="1.2" />
    </>
  ),
  snake: (
    <>
      <rect x="4" y="4" width="48" height="48" rx="4" fill="#2c9420" stroke={O} strokeWidth="1.5" />
      <path d="M12 44h22v-12h-14v-10h22" stroke="#fff" strokeWidth="8" fill="none" strokeLinejoin="round" />
      <path d="M12 44h22v-12h-14v-10h22" stroke="#ff6060" strokeWidth="5" fill="none" strokeLinejoin="round" strokeDasharray="4 3" />
      <path d="M12 12h5v6h4l-1 4h-6l-2-2z" fill="#f4c430" stroke={O} />
      <image href={CATCHY_URI} x="36" y="13" width="17" height="16" />
    </>
  ),
  invaders: (
    <>
      <rect x="4" y="4" width="48" height="48" rx="4" fill="#1a1450" stroke={O} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="1" fill="#fff" />
      <circle cx="44" cy="20" r="1" fill="#fff" />
      <path d="M16 14h6v8h3l-1 3h-8z" fill="#ff9ec7" stroke="#fff" strokeWidth=".8" />
      <path d="M34 12h6v8h3l-1 3h-8z" fill="#4aab9a" stroke="#fff" strokeWidth=".8" />
      <rect x="27" y="26" width="2" height="6" fill="#f4c430" />
      <ellipse cx="28" cy="44" rx="17" ry="5" fill="#b7c4d6" stroke={O} />
      <path d="M17 42a11 9 0 0 1 22 0z" fill="#bfe6ff" fillOpacity=".7" stroke={O} />
      <image href={CATCHY_URI} x="21" y="33" width="14" height="13" />
    </>
  ),
};

export function GameIcon({ id, size = 56 }: { id: GameId; size?: number }) {
  return (
    <svg viewBox="0 0 56 56" width={size} height={size} aria-hidden="true" className="gtile__icon">
      {art[id]}
    </svg>
  );
}
