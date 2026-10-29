import { assets } from '../../data/assets';
import { CATCHY_SIZE, CATCHY_URI, INK } from './art';
import type { PetState } from './types';

/**
 * The buddy's figure: the canonical Catchy image, untouched. Poses only move
 * or tilt the whole sprite (CSS); nothing about Catchy himself is redrawn.
 * A sock / Pjoy prop (real IYS photo / print) can sit in front of his chin.
 *
 * viewBox 0 0 136 136: the head (136 × 127) on top, room for a prop below.
 */
const SOCK_PHOTO = assets.products['i-love-cairo-neck-socks']?.images[0]?.src ?? null;
const PJOY_PRINT = assets.tiles.find((t) => t.handle === 'cereal-killer-pjoys')?.src ?? null;

export function CatchySprite({ pose }: { pose: PetState; look?: { x: number; y: number }; blink?: boolean }) {
  const holding = (pose === 'carry-sock' && SOCK_PHOTO) || (pose === 'carry-pjoy' && PJOY_PRINT);
  return (
    <svg className="csprite" viewBox="0 0 136 136" width="100%" height="100%" aria-hidden="true" focusable="false" overflow="visible">
      <g className="csprite__walk">
        <g className="csprite__head">
          <image href={CATCHY_URI} x="0" y="0" width={CATCHY_SIZE.w} height={CATCHY_SIZE.h} />
        </g>
        {holding && (
          <g className="csprite__prop">
            {pose === 'carry-pjoy' ? (
              <>
                <defs>
                  <pattern id="cpet-pjoy" patternUnits="userSpaceOnUse" width="48" height="30" x="44" y="108">
                    <image href={PJOY_PRINT!} width="48" height="48" y="-2" preserveAspectRatio="xMidYMin slice" />
                  </pattern>
                </defs>
                <rect x="44" y="108" width="48" height="24" rx="4" fill="url(#cpet-pjoy)" stroke={INK} strokeWidth="2.4" />
              </>
            ) : (
              <>
                <rect x="50" y="100" width="36" height="34" rx="4" fill="#fff" stroke={INK} strokeWidth="2.4" />
                <image href={SOCK_PHOTO!} x="52" y="102" width="32" height="30" preserveAspectRatio="xMidYMid meet" />
              </>
            )}
          </g>
        )}
      </g>
    </svg>
  );
}
