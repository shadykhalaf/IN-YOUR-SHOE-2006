import { CATCHY_RATIO, CATCHY_URI, COLORS, INK } from '../../features/catchy/art';

/**
 * CATCHY in the IYS GAMES: the one canonical drawing from
 * src/features/catchy/art.ts (shared with the desktop buddy), as an <img> for
 * the DOM and a decoded image for canvas games.
 */
export { CATCHY_RATIO, CATCHY_URI };
export const CATCHY = { teal: COLORS.teal, ink: INK } as const;

export function CatchySticker({ size = 48, alt = '', className }: { size?: number; alt?: string; className?: string }) {
  return <img src={CATCHY_URI} alt={alt} width={size} height={Math.round(size / CATCHY_RATIO)} className={className} draggable={false} />;
}

let img: HTMLImageElement | null = null;
/** Shared decoded Catchy image for canvas games (drawn once loaded; a teal head stands in for the first frame). */
export function catchyImage(): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  if (!img) {
    img = new Image();
    img.src = CATCHY_URI;
  }
  return img;
}

/** Draw Catchy centred at (x, y), `w` game units wide. */
export function drawCatchy(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, rot = 0) {
  const h = w / CATCHY_RATIO;
  const im = catchyImage();
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  if (im?.complete && im.naturalWidth) ctx.drawImage(im, -w / 2, -h / 2, w, h);
  else {
    ctx.fillStyle = CATCHY.teal;
    ctx.strokeStyle = CATCHY.ink;
    ctx.lineWidth = Math.max(1, w / 20);
    ctx.beginPath();
    ctx.arc(0, 0, w * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}
