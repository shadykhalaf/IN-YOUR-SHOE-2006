/** Original canvas drawings shared by the IYS games: socks, Pjoys, IYS palette. */
export const IYS = {
  coral: '#ff6060',
  blue: '#06478e',
  sky: '#2f86e0',
  skyPale: '#e3f2ff',
  grass: '#2fbf4a',
  yellow: '#f4c430',
  teal: '#4aab9a',
  pink: '#ff9ec7',
  cream: '#fff4dc',
  denim: '#3b5f8f',
  ink: '#1b2b44',
  purple: '#8a5cd6',
  orange: '#ffb020',
} as const;

/** Sock seen from the side: cuff at top, toe pointing right. (x, y) = top-left, s = height. */
export function drawSock(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string = IYS.coral, stripe: string = '#fff', flip = false) {
  ctx.save();
  ctx.translate(x + (flip ? s * 0.8 : 0), y);
  if (flip) ctx.scale(-1, 1);
  const w = s * 0.42;
  ctx.beginPath();
  ctx.moveTo(s * 0.12, 0);
  ctx.lineTo(s * 0.12 + w, 0);
  ctx.lineTo(s * 0.12 + w, s * 0.62);
  ctx.quadraticCurveTo(s * 0.8, s * 0.6, s * 0.8, s * 0.82);
  ctx.quadraticCurveTo(s * 0.8, s, s * 0.55, s);
  ctx.lineTo(s * 0.3, s);
  ctx.quadraticCurveTo(s * 0.12, s, s * 0.12, s * 0.78);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = stripe;
  ctx.fillRect(0, s * 0.1, s, s * 0.09);
  ctx.fillRect(0, s * 0.3, s, s * 0.09);
  ctx.globalAlpha = 0.35;
  ctx.fillRect(s * 0.5, s * 0.8, s, s);
  ctx.restore();
  ctx.lineWidth = Math.max(1, s / 14);
  ctx.strokeStyle = IYS.ink;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
}

export type PjoyPattern = 'dots' | 'check' | 'stripes' | 'hearts' | 'plain';

/** Pjoy top (pyjama shirt) silhouette with a print. (x, y) = top-left, s = size. */
export function drawPjoy(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string = IYS.pink, pattern: PjoyPattern = 'dots', print = '#fff') {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(s * 0.3, s * 0.05);
  ctx.lineTo(s * 0.42, s * 0.12);
  ctx.lineTo(s * 0.58, s * 0.12);
  ctx.lineTo(s * 0.7, s * 0.05);
  ctx.lineTo(s * 0.98, s * 0.25);
  ctx.lineTo(s * 0.86, s * 0.42);
  ctx.lineTo(s * 0.78, s * 0.36);
  ctx.lineTo(s * 0.78, s * 0.95);
  ctx.lineTo(s * 0.22, s * 0.95);
  ctx.lineTo(s * 0.22, s * 0.36);
  ctx.lineTo(s * 0.14, s * 0.42);
  ctx.lineTo(s * 0.02, s * 0.25);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = print;
  const step = s * 0.16;
  if (pattern === 'dots') for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) ctx.fillRect(i * step + ((j % 2) * step) / 2, j * step, s * 0.05, s * 0.05);
  else if (pattern === 'check') {
    ctx.globalAlpha = 0.45;
    for (let i = 0; i < 7; i++) {
      ctx.fillRect(i * step, 0, step / 2, s);
      ctx.fillRect(0, i * step, s, step / 2);
    }
  } else if (pattern === 'stripes') for (let i = 0; i < 8; i++) ctx.fillRect(i * step, 0, step * 0.35, s);
  else if (pattern === 'hearts')
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) {
        const hx = s * 0.12 + i * s * 0.25;
        const hy = s * 0.2 + j * s * 0.22;
        ctx.beginPath();
        ctx.arc(hx - s * 0.025, hy, s * 0.03, 0, Math.PI * 2);
        ctx.arc(hx + s * 0.025, hy, s * 0.03, 0, Math.PI * 2);
        ctx.moveTo(hx - s * 0.055, hy + s * 0.01);
        ctx.lineTo(hx, hy + s * 0.07);
        ctx.lineTo(hx + s * 0.055, hy + s * 0.01);
        ctx.fill();
      }
  ctx.restore();
  ctx.lineWidth = Math.max(1, s / 16);
  ctx.strokeStyle = IYS.ink;
  ctx.lineJoin = 'round';
  ctx.stroke();
  // button placket
  ctx.beginPath();
  ctx.moveTo(s * 0.5, s * 0.14);
  ctx.lineTo(s * 0.5, s * 0.92);
  ctx.lineWidth = Math.max(1, s / 30);
  ctx.stroke();
  ctx.restore();
}

/** Small 4-point Y2K sparkle. */
export function drawSparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color = '#fff') {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
  ctx.restore();
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Big centred canvas banner (e.g. "DROP CLEARED!"). */
export function drawBanner(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, size: number, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `bold ${size}px Tahoma, Verdana, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(3, size / 5);
  ctx.strokeStyle = IYS.blue;
  ctx.strokeText(text, cx, cy);
  ctx.fillStyle = IYS.yellow;
  ctx.fillText(text, cx, cy);
  ctx.restore();
}
