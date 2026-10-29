import { useCallback, useEffect, useRef, useState } from 'react';
import { blip } from '../../lib/sound';
import { prefersReducedMotion } from '../../lib/motion';
import { drawBanner, drawPjoy, drawSock, IYS } from '../shared/art';
import { drawCatchy } from '../shared/catchy';
import { COPY, DPad, GameShell, keyDir, useGamePhase, type GameProps } from '../shared/GameShell';
import { useGameCanvas, useRaf } from '../shared/loop';
import { freshSeed } from '../shared/rng';
import { createChomp, MAZES, pos, stepChomp, type ChompState, type Dir, type Enemy } from './logic';

const T = 20;
const W = 19 * T;
const H = 15 * T;

const NAMES: Record<Enemy['kind'], string> = { lint: 'Lint Monster', sock: 'Lost Sock', gremlin: 'Packaging Gremlin', bug: 'Closet Bug' };
const THEME = [
  { wall: '#7a4f2a', edge: '#e8b47f', floor: '#2b1a10' },
  { wall: '#2f86e0', edge: '#bfe0ff', floor: '#0c2a4f' },
  { wall: '#c2603a', edge: '#ffd18a', floor: '#1d1440' },
];

function eyes(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, dx: number, dy: number) {
  for (const ox of [-s * 0.18, s * 0.18]) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x + ox, y - s * 0.08, s * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = IYS.ink;
    ctx.beginPath();
    ctx.arc(x + ox + dx * s * 0.05, y - s * 0.08 + dy * s * 0.05, s * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Original enemies: a lint monster, a lost sock, a packaging gremlin and a closet bug. */
function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, x: number, y: number, s: number, scared: boolean, blink: boolean, t: number) {
  const [dx, dy] = e.dir === 'left' ? [-1, 0] : e.dir === 'right' ? [1, 0] : e.dir === 'up' ? [0, -1] : [0, 1];
  if (e.mode === 'eaten') return eyes(ctx, x, y, s, dx, dy);
  ctx.save();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = IYS.ink;
  const col = scared ? (blink ? '#fff' : '#9fd0ff') : null;
  if (e.kind === 'lint') {
    ctx.fillStyle = col ?? '#b7a9d6';
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      ctx.moveTo(x + Math.cos(a) * s * 0.28 + s * 0.18, y + Math.sin(a) * s * 0.28);
      ctx.arc(x + Math.cos(a) * s * 0.28, y + Math.sin(a) * s * 0.28, s * 0.18, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, s * 0.32, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.kind === 'sock') {
    const hop = prefersReducedMotion() ? 0 : Math.abs(Math.sin(t * 10)) * s * 0.08;
    drawSock(ctx, x - s * 0.42, y - s * 0.5 - hop, s, col ?? IYS.coral, '#fff', dx < 0);
  } else if (e.kind === 'gremlin') {
    ctx.fillStyle = col ?? '#c98a52';
    ctx.fillRect(x - s * 0.4, y - s * 0.36, s * 0.8, s * 0.72);
    ctx.strokeRect(x - s * 0.4, y - s * 0.36, s * 0.8, s * 0.72);
    ctx.fillStyle = scared ? '#fff' : IYS.yellow;
    ctx.fillRect(x - s * 0.08, y - s * 0.36, s * 0.16, s * 0.72);
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(x - s * 0.3 + i * s * 0.16, y + s * 0.18);
      ctx.lineTo(x - s * 0.22 + i * s * 0.16, y + s * 0.3);
      ctx.lineTo(x - s * 0.14 + i * s * 0.16, y + s * 0.18);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = col ?? '#3d9b52';
    ctx.beginPath();
    ctx.ellipse(x, y + s * 0.05, s * 0.34, s * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y - s * 0.32);
    ctx.lineTo(x, y + s * 0.44);
    ctx.moveTo(x - s * 0.12, y - s * 0.34);
    ctx.lineTo(x - s * 0.28, y - s * 0.58);
    ctx.moveTo(x + s * 0.12, y - s * 0.34);
    ctx.lineTo(x + s * 0.28, y - s * 0.58);
    for (const sy of [-0.05, 0.15, 0.32]) {
      ctx.moveTo(x - s * 0.34, y + s * sy);
      ctx.lineTo(x - s * 0.5, y + s * (sy + 0.06));
      ctx.moveTo(x + s * 0.34, y + s * sy);
      ctx.lineTo(x + s * 0.5, y + s * (sy + 0.06));
    }
    ctx.stroke();
  }
  ctx.restore();
  if (e.kind !== 'sock') eyes(ctx, x, y, s, dx, dy);
  else eyes(ctx, x + (dx < 0 ? -s * 0.05 : s * 0.02), y - s * 0.12, s * 0.8, dx, dy);
}

export default function Chomp(props: GameProps) {
  const game = useGamePhase('chomp');
  const st = useRef<ChompState>(createChomp(freshSeed()));
  const banner = useRef<{ text: string; t: number } | null>(null);
  const [hud, setHud] = useState({ score: 0, lives: 3, level: 1 });
  const [announce, setAnnounce] = useState<string | null>(null);

  const draw = useCallback(() => {
    const ctx = canvas.ctx();
    if (!ctx) return;
    const s = st.current;
    const th = THEME[s.maze]!;
    ctx.fillStyle = th.floor;
    ctx.fillRect(0, 0, W, H);
    for (let y = 0; y < s.h; y++)
      for (let x = 0; x < s.w; x++) {
        if (!s.walls[y * s.w + x]) continue;
        // closet shelving: solid blocks, a light edge only where a wall meets the floor
        ctx.fillStyle = th.wall;
        ctx.fillRect(x * T, y * T, T, T);
        ctx.fillStyle = th.edge;
        const wall = (dx: number, dy: number) => x + dx < 0 || y + dy < 0 || x + dx >= s.w || y + dy >= s.h || s.walls[(y + dy) * s.w + x + dx];
        if (!wall(0, -1)) ctx.fillRect(x * T, y * T, T, 3);
        if (!wall(0, 1)) ctx.fillRect(x * T, y * T + T - 3, T, 3);
        if (!wall(-1, 0)) ctx.fillRect(x * T, y * T, 3, T);
        if (!wall(1, 0)) ctx.fillRect(x * T + T - 3, y * T, 3, T);
      }
    const pulse = prefersReducedMotion() ? 1 : 0.85 + Math.sin(s.time * 6) * 0.15;
    for (const [i, k] of s.pickups) {
      const x = (i % s.w) * T;
      const y = Math.floor(i / s.w) * T;
      if (k === 'sock') drawSock(ctx, x + 6, y + 5, 10, IYS.yellow, '#fff');
      else {
        const z = 18 * pulse;
        drawPjoy(ctx, x + T / 2 - z / 2, y + T / 2 - z / 2, z, IYS.pink, 'hearts');
      }
    }
    const blink = s.power > 0 && s.power < 1.6 && Math.floor(s.time * 6) % 2 === 0;
    for (const e of s.enemies) {
      const [ex, ey] = pos(e);
      drawEnemy(ctx, e, ex * T + T / 2, ey * T + T / 2, T, e.mode === 'scared', blink, s.time);
    }
    const [px, py] = pos(s.player);
    drawCatchy(ctx, px * T + T / 2, py * T + T / 2, T * 1.3);
    if (s.freeze > 0 && !s.over) drawBanner(ctx, `${MAZES[s.maze]!.name} · READY!`, W / 2, H / 2 + T * 1.5, 16);
    if (banner.current) drawBanner(ctx, banner.current.text, W / 2, H / 2 - T * 2, 22);
  }, []);
  const canvas = useGameCanvas(W, H, () => draw());

  const sync = () => {
    const s = st.current;
    setHud((h) => (h.score === s.score && h.lives === s.lives && h.level === s.level ? h : { score: s.score, lives: s.lives, level: s.level }));
  };
  const reset = () => {
    st.current = createChomp(freshSeed());
    banner.current = null;
    setAnnounce(null);
    sync();
    game.start();
  };

  useRaf((dt) => {
    const s = st.current;
    if (banner.current && (banner.current.t -= dt) <= 0) banner.current = null;
    for (const ev of stepChomp(s, dt)) {
      if (ev === 'sock') blip(700 + (s.pickups.size % 2) * 120, 0.03);
      else if (ev === 'pjoy') blip(440, 0.3, 'triangle', 880);
      else if (ev === 'eat') blip(1200, 0.12, 'square', 1800);
      else if (ev === 'hit') blip(400, 0.4, 'sawtooth', 90);
      else if (ev === 'clear') {
        banner.current = { text: COPY.levelUp, t: 1.6 };
        setAnnounce(`${COPY.levelUp} ${MAZES[s.maze]!.name}`);
        blip(990, 0.2, 'triangle');
      } else if (ev === 'over') game.end(s.score);
    }
    sync();
    draw();
  }, game.phase === 'playing');
  useEffect(() => draw(), [game.phase, draw]);

  const dir = (d: Dir) => {
    if (game.phaseRef.current === 'playing') st.current.want = d;
  };

  return (
    <GameShell
      title="CATCHY CHOMP"
      scoreId="chomp"
      game={game}
      score={hud.score}
      stats={[
        { label: 'LIVES', value: '♥'.repeat(Math.max(0, hud.lives)) || '0' },
        { label: 'LEVEL', value: hud.level },
      ]}
      help={`Arrows or WASD move Catchy. Socks +10. A Pjoy (+50) lets Catchy chase the ${Object.values(NAMES).join(', ')} for a few seconds. 3 lives · 3 mazes · P pause.`}
      touchHelp="Use the D-pad. Eat every sock; a Pjoy lets Catchy chase the monsters."
      intro={
        <>
          <p>Grab every sock in the closet. Dodge the laundry monsters, or grab a Pjoy and chase them back.</p>
          <p>Arrows / WASD · D-pad on phones</p>
        </>
      }
      onStart={reset}
      props={props}
      announce={announce}
      keys={(e, down) => {
        const d = keyDir(e.key);
        if (!d) return false;
        if (down) dir(d);
        return true;
      }}
      touch={<DPad onDir={dir} />}
    >
      <div className="game__fit" ref={canvas.wrap}>
        <canvas ref={canvas.canvas} role="img" aria-label={`Chomp maze ${MAZES[st.current.maze]!.name}, ${st.current.pickups.size} socks left, ${hud.lives} lives`} />
      </div>
    </GameShell>
  );
}
