import { useCallback, useEffect, useRef, useState } from 'react';
import { blip } from '../../lib/sound';
import { prefersReducedMotion } from '../../lib/motion';
import { drawBanner, drawSparkle, IYS, roundRect } from '../shared/art';
import { drawCatchy } from '../shared/catchy';
import { GameShell, PadButton, useGamePhase, type GameProps } from '../shared/GameShell';
import { useGameCanvas, useRaf } from '../shared/loop';
import { freshSeed } from '../shared/rng';
import { createTower, stepTower, towerScore, VIEW_H, WIDTH, worldAt, WORLDS, type Platform, type TowerState } from './logic';

const W = WIDTH;
const H = VIEW_H;

/** Five lightweight procedural worlds; decorations scroll at 30% for depth. */
function background(ctx: CanvasRenderingContext2D, world: number, cam: number, time: number) {
  const par = cam * 0.3;
  const mod = (v: number, m: number) => ((v % m) + m) % m;
  if (world === 0) {
    // bedroom: striped wallpaper + wardrobes
    for (let x = 0; x < W; x += 24) {
      ctx.fillStyle = (x / 24) % 2 ? '#ffe9ef' : '#fff6f0';
      ctx.fillRect(x, 0, 24, H);
    }
    ctx.globalAlpha = 0.4;
    for (let i = -1; i < 3; i++) {
      const y = mod(par, 300) + i * 300;
      ctx.fillStyle = '#c98a52';
      ctx.fillRect(18, y, 70, 180);
      ctx.fillRect(272, y + 120, 70, 180);
      ctx.fillStyle = '#e8b47f';
      ctx.fillRect(22, y + 4, 30, 172);
      ctx.fillRect(54, y + 4, 30, 172);
      ctx.fillRect(276, y + 124, 62, 172);
    }
    ctx.globalAlpha = 1;
  } else if (world === 1) {
    // laundry: tiles + washing machine portholes + bubbles
    ctx.fillStyle = '#d7efff';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#b4dcf7';
    for (let x = 0; x < W; x += 30) ctx.strokeRect(x, 0, 0, H);
    for (let y = mod(par, 30); y < H; y += 30) ctx.strokeRect(0, y, W, 0);
    for (let i = -1; i < 3; i++) {
      const y = mod(par, 280) + i * 280;
      for (const x of [56, 304]) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(x - 40, y, 80, 90);
        ctx.strokeStyle = '#7d9bbd';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 40, y, 80, 90);
        ctx.fillStyle = '#9fd0ff';
        ctx.beginPath();
        ctx.arc(x, y + 52, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
    if (!prefersReducedMotion())
      for (let i = 0; i < 8; i++) {
        ctx.strokeStyle = 'rgba(255,255,255,.9)';
        ctx.beginPath();
        ctx.arc(mod(i * 53 + time * 12, W), mod(H - time * 40 - i * 77 + par, H), 4 + (i % 3) * 2, 0, Math.PI * 2);
        ctx.stroke();
      }
  } else if (world === 2) {
    // Cairo balcony at dusk: skyline with domes + balcony railings
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#2a1f5c');
    g.addColorStop(1, '#ff9a6b');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#1d1638';
    const base = H - 60 + mod(par * 0.2, 20);
    [[0, 70, 60], [60, 110, 40], [100, 50, 70], [170, 130, 30], [200, 80, 60], [260, 60, 50], [310, 100, 50]].forEach(([x, h, w]) => {
      ctx.fillRect(x!, base - h!, w!, h! + 80);
    });
    ctx.beginPath();
    ctx.arc(135, base - 50, 18, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(183, base - 165, 4, 40);
    ctx.fillStyle = '#ffd18a';
    for (let i = 0; i < 18; i++) ctx.fillRect((i * 41) % W, base - 20 - ((i * 37) % 90), 4, 5);
    ctx.strokeStyle = 'rgba(255,255,255,.25)';
    ctx.lineWidth = 2;
    for (let i = -1; i < 3; i++) {
      const y = mod(par, 240) + i * 240;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      for (let x = 6; x < W; x += 18) {
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 26);
      }
      ctx.stroke();
    }
  } else if (world === 3) {
    // locker room: rows of lockers with vents
    ctx.fillStyle = '#7e9a8c';
    ctx.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 45)
      for (let y = mod(par, 160) - 160; y < H; y += 160) {
        ctx.fillStyle = (x / 45) % 2 ? '#5d7f71' : '#668a7b';
        ctx.fillRect(x + 2, y + 2, 41, 156);
        ctx.fillStyle = '#3f5a4f';
        for (let v = 0; v < 4; v++) ctx.fillRect(x + 10, y + 14 + v * 6, 25, 2);
        ctx.fillRect(x + 34, y + 80, 4, 14);
      }
  } else {
    // Y2K Catchy sky
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#5b2bb5');
    g.addColorStop(0.6, '#ff6fb5');
    g.addColorStop(1, '#ffd36b');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 24; i++) drawSparkle(ctx, (i * 67) % W, mod(i * 91 + par, H), 3 + (i % 4) * 1.5, i % 3 ? '#fff' : IYS.yellow);
  }
}

const PLAT = ['#a0663a', '#ff9ec7', '#d8c3a5', '#b9c4cc', '#ffffff'];

function platform(ctx: CanvasRenderingContext2D, p: Platform, y: number, world: number) {
  const x = p.x - p.w / 2;
  if (p.floor === 0) {
    ctx.fillStyle = '#7a4f2a';
    ctx.fillRect(0, y, W, 40);
    ctx.fillStyle = '#c98a52';
    ctx.fillRect(0, y, W, 6);
    return;
  }
  ctx.save();
  if (world === 4) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    for (let i = 0; i <= 4; i++) ctx.arc(x + (i / 4) * p.w, y + 6, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x, y + 2, p.w, 10);
  } else if (world === 1) {
    // a stack of folded Pjoys
    ctx.fillStyle = PLAT[1]!;
    roundRect(ctx, x, y, p.w, 12, 4);
    ctx.fill();
    ctx.strokeStyle = IYS.ink;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    for (let i = x + 6; i < x + p.w - 4; i += 10) ctx.fillRect(i, y + 4, 3, 3);
  } else {
    ctx.fillStyle = PLAT[world]!;
    ctx.fillRect(x, y, p.w, 10);
    ctx.strokeStyle = IYS.ink;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, p.w, 10);
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.fillRect(x + 2, y + 2, p.w - 4, 2);
    if (world === 0) {
      // shelf brackets + a folded tee
      ctx.fillStyle = IYS.ink;
      ctx.fillRect(x + 8, y + 10, 3, 6);
      ctx.fillRect(x + p.w - 11, y + 10, 3, 6);
    }
  }
  if (p.speed) {
    ctx.fillStyle = IYS.coral;
    ctx.fillRect(x + p.w / 2 - 6, y + 3, 12, 3);
  }
  ctx.restore();
  if (p.floor % 10 === 0) {
    ctx.fillStyle = world === 2 || world === 4 ? '#fff' : IYS.blue;
    ctx.font = 'bold 10px Tahoma, Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(p.floor), p.x, y + 24);
  }
}

export default function Tower(props: GameProps) {
  const game = useGamePhase('tower');
  const st = useRef<TowerState>(createTower(freshSeed()));
  const held = useRef({ left: false, right: false });
  const banner = useRef<{ text: string; t: number } | null>(null);
  const [hud, setHud] = useState({ score: 0, floor: 0, combo: 0 });
  const [announce, setAnnounce] = useState<string | null>(null);

  const draw = useCallback(() => {
    const ctx = canvas.ctx();
    if (!ctx) return;
    const s = st.current;
    const world = worldAt(s.floor);
    const sy = (y: number) => H - (y - s.camera);
    background(ctx, world, s.camera, s.time);
    for (const p of s.platforms) {
      const y = sy(p.y);
      if (y > -20 && y < H + 20) platform(ctx, p, y, worldAt(p.floor));
    }
    drawCatchy(ctx, s.px, sy(s.py) - 15, 34, prefersReducedMotion() ? 0 : Math.max(-0.3, Math.min(0.3, s.vx / 900)));
    if (s.scroll > 0) {
      ctx.fillStyle = 'rgba(255,96,96,.5)';
      ctx.fillRect(0, H - 4, W, 4);
    }
    if (s.combo >= 2) drawBanner(ctx, `COMBO x${s.combo}!`, W / 2, 40, 18);
    if (banner.current) drawBanner(ctx, banner.current.text, W / 2, H / 3, 20, Math.min(1, banner.current.t));
  }, []);
  const canvas = useGameCanvas(W, H, () => draw());

  const reset = () => {
    st.current = createTower(freshSeed());
    banner.current = { text: WORLDS[0].name, t: 1.6 };
    held.current = { left: false, right: false };
    setAnnounce(null);
    setHud({ score: 0, floor: 0, combo: 0 });
    game.start();
  };
  useEffect(() => {
    if (game.phase !== 'playing') held.current = { left: false, right: false };
  }, [game.phase]);

  useRaf((dt) => {
    const s = st.current;
    if (banner.current && (banner.current.t -= dt) <= 0) banner.current = null;
    const steer = held.current.left === held.current.right ? 0 : held.current.left ? -1 : 1;
    for (const ev of stepTower(s, dt, steer)) {
      if (ev === 'land') blip(500 + Math.min(600, s.floor * 6), 0.04, 'triangle');
      else if (ev === 'combo') blip(1100, 0.2, 'triangle', 1700);
      else if (ev === 'world') {
        const name = WORLDS[worldAt(s.floor)]!.name;
        banner.current = { text: name, t: 1.8 };
        setAnnounce(`LEVEL UP: ${name}`);
      } else if (ev === 'over') game.end(towerScore(s));
    }
    const score = towerScore(s);
    setHud((h) => (h.score === score && h.floor === s.best && h.combo === s.combo ? h : { score, floor: s.best, combo: s.combo }));
    draw();
  }, game.phase === 'playing');
  useEffect(() => draw(), [game.phase, draw]);

  const hold = (side: 'left' | 'right', on: boolean) => {
    held.current[side] = on && game.phaseRef.current === 'playing';
  };

  return (
    <GameShell
      title="IYS TOWER"
      scoreId="tower"
      game={game}
      score={hud.score}
      stats={[
        { label: 'FLOOR', value: hud.floor },
        { label: 'COMBO', value: hud.combo >= 2 ? `x${hud.combo}` : '-' },
      ]}
      help="Catchy bounces by itself. ← → or A D steer. Skip floors in a row for a COMBO bonus. Don't fall off the bottom! Space starts, P pauses."
      touchHelp="Hold LEFT / RIGHT (or the left / right half of the screen) to steer. Don't fall off the bottom!"
      intro={
        <>
          <p>Bounce up the wardrobe, the Pjoy laundry room, a Cairo balcony, the lockers and the Y2K sky.</p>
          <p>← → / A D steer · it jumps by itself</p>
        </>
      }
      onStart={reset}
      props={props}
      announce={announce}
      keys={(e, down) => {
        const side = e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A' ? 'left' : e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D' ? 'right' : null;
        if (!side) return false;
        hold(side, down);
        return true;
      }}
      touch={
        <>
          <PadButton className="pad--wide" label="◀ LEFT" aria="Steer left" onDown={() => hold('left', true)} onUp={() => hold('left', false)} />
          <PadButton className="pad--wide" label="RIGHT ▶" aria="Steer right" onDown={() => hold('right', true)} onUp={() => hold('right', false)} />
        </>
      }
    >
      <div
        className="game__fit"
        ref={canvas.wrap}
        onPointerDown={(e) => {
          if (e.pointerType === 'mouse') return;
          const r = e.currentTarget.getBoundingClientRect();
          const side = e.clientX < r.left + r.width / 2 ? 'left' : 'right';
          e.currentTarget.setPointerCapture?.(e.pointerId);
          hold(side, true);
          e.currentTarget.dataset.side = side;
        }}
        onPointerUp={(e) => {
          const side = e.currentTarget.dataset.side as 'left' | 'right' | undefined;
          if (side) hold(side, false);
          delete e.currentTarget.dataset.side;
        }}
        onPointerCancel={() => {
          hold('left', false);
          hold('right', false);
        }}
      >
        <canvas ref={canvas.canvas} role="img" aria-label={`Tower, floor ${hud.floor}, world ${WORLDS[worldAt(hud.floor)]!.name}`} />
      </div>
    </GameShell>
  );
}
