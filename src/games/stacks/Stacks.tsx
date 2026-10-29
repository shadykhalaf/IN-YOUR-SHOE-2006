import { useCallback, useEffect, useRef, useState } from 'react';
import { blip } from '../../lib/sound';
import { prefersReducedMotion } from '../../lib/motion';
import { drawBanner, IYS } from '../shared/art';
import { COPY, GameShell, PadButton, useGamePhase, type GameProps } from '../shared/GameShell';
import { useGameCanvas, useRaf } from '../shared/loop';
import { useHoldRepeat } from '../shared/repeat';
import { freshSeed } from '../shared/rng';
import { cells, COLS, createStacks, drop, ghostY, gravity, hardDrop, move, rotate, ROWS, type Kind, type StacksState } from './logic';

const C = 24;
const BW = COLS * C;
const W = BW + 120;
const H = ROWS * C;

/** Each shape wears an IYS print: sock stripes, denim, Pjoy dots, plaid, hearts... */
const SKIN: Record<Kind, { fill: string; print: string; kind: 'stripes' | 'denim' | 'dots' | 'plaid' | 'plain' | 'heart' }> = {
  I: { fill: IYS.coral, print: '#fff', kind: 'stripes' },
  O: { fill: IYS.denim, print: '#9fc0e8', kind: 'denim' },
  T: { fill: IYS.pink, print: '#fff', kind: 'dots' },
  S: { fill: IYS.grass, print: '#c9f2b8', kind: 'plaid' },
  Z: { fill: IYS.yellow, print: '#fff6c8', kind: 'plain' },
  J: { fill: IYS.teal, print: '#d2f1ea', kind: 'dots' },
  L: { fill: IYS.purple, print: '#f0e4ff', kind: 'heart' },
};

function block(ctx: CanvasRenderingContext2D, x: number, y: number, k: Kind) {
  const s = SKIN[k];
  ctx.save();
  ctx.fillStyle = s.fill;
  ctx.fillRect(x, y, C, C);
  ctx.fillStyle = s.print;
  if (s.kind === 'stripes') {
    ctx.fillRect(x, y + 5, C, 3);
    ctx.fillRect(x, y + 14, C, 3);
  } else if (s.kind === 'denim') {
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = s.print;
    ctx.lineWidth = 1;
    for (let i = -C; i < C; i += 4) {
      ctx.beginPath();
      ctx.moveTo(x + i, y + C);
      ctx.lineTo(x + i + C, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.setLineDash([2, 2]);
    ctx.strokeStyle = IYS.orange;
    ctx.strokeRect(x + 3.5, y + 3.5, C - 7, C - 7);
    ctx.setLineDash([]);
  } else if (s.kind === 'dots') {
    for (const [dx, dy] of [[5, 5], [15, 5], [10, 12], [5, 18], [15, 18]] as const) ctx.fillRect(x + dx, y + dy, 3, 3);
  } else if (s.kind === 'plaid') {
    ctx.globalAlpha = 0.55;
    ctx.fillRect(x + 6, y, 4, C);
    ctx.fillRect(x + 16, y, 4, C);
    ctx.fillRect(x, y + 6, C, 4);
    ctx.fillRect(x, y + 16, C, 4);
    ctx.globalAlpha = 1;
  } else if (s.kind === 'heart') {
    ctx.beginPath();
    ctx.arc(x + 9.5, y + 10, 3, 0, Math.PI * 2);
    ctx.arc(x + 14.5, y + 10, 3, 0, Math.PI * 2);
    ctx.moveTo(x + 6.6, y + 11);
    ctx.lineTo(x + 12, y + 17);
    ctx.lineTo(x + 17.4, y + 11);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ctx.fillRect(x + 1, y + 1, C - 2, 2);
  ctx.strokeStyle = IYS.ink;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 0.75, y + 0.75, C - 1.5, C - 1.5);
  ctx.restore();
}

type Act = 'left' | 'right' | 'rot' | 'ccw' | 'soft' | 'hard';
const KEYS: Record<string, Act> = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'rot', w: 'rot', W: 'rot', x: 'rot', X: 'rot', z: 'ccw', Z: 'ccw', ArrowDown: 'soft', s: 'soft', S: 'soft', ' ': 'hard' };

export default function Stacks(props: GameProps) {
  const game = useGamePhase('stacks');
  const st = useRef<StacksState>(createStacks(freshSeed()));
  const fall = useRef(0);
  const flash = useRef(0);
  const [hud, setHud] = useState({ score: 0, lines: 0, level: 1 });
  const [announce, setAnnounce] = useState<string | null>(null);
  const repeat = useHoldRepeat();

  const draw = useCallback(() => {
    const ctx = canvas.ctx();
    if (!ctx) return;
    const s = st.current;
    ctx.fillStyle = '#0d2a52';
    ctx.fillRect(0, 0, W, H);
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++) {
        const k = s.board[y]![x];
        if (k) block(ctx, x * C, y * C, k);
        else {
          ctx.fillStyle = (x + y) % 2 ? '#123766' : '#10315c';
          ctx.fillRect(x * C, y * C, C, C);
        }
      }
    if (!s.over) {
      const gy = ghostY(s);
      ctx.strokeStyle = 'rgba(255,255,255,.5)';
      ctx.lineWidth = 1.5;
      for (const [cx, cy] of cells(s.piece.kind, s.piece.rot)) if (gy + cy >= 0) ctx.strokeRect((s.piece.x + cx) * C + 2, (gy + cy) * C + 2, C - 4, C - 4);
      for (const [cx, cy] of cells(s.piece.kind, s.piece.rot)) if (s.piece.y + cy >= 0) block(ctx, (s.piece.x + cx) * C, (s.piece.y + cy) * C, s.piece.kind);
    }
    // side panel
    ctx.fillStyle = '#e3f2ff';
    ctx.fillRect(BW, 0, W - BW, H);
    ctx.fillStyle = IYS.blue;
    ctx.fillRect(BW, 0, 3, H);
    ctx.font = 'bold 13px Tahoma, Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('NEXT', BW + 60, 26);
    const nc = cells(s.next, 0);
    const nw = (Math.max(...nc.map(([x]) => x)) + 1) * 20;
    for (const [cx, cy] of nc) {
      ctx.save();
      ctx.translate(BW + 60 - nw / 2 + cx * 20, 44 + cy * 20);
      ctx.scale(20 / C, 20 / C);
      block(ctx, 0, 0, s.next);
      ctx.restore();
    }
    ctx.fillStyle = IYS.blue;
    const rows: [string, number][] = [['LEVEL', s.level], ['LINES', s.lines], ['SCORE', s.score]];
    rows.forEach(([l, v], i) => {
      ctx.font = '11px Tahoma, Verdana, sans-serif';
      ctx.fillText(l, BW + 60, 150 + i * 52);
      ctx.font = 'bold 18px Tahoma, Verdana, sans-serif';
      ctx.fillText(String(v), BW + 60, 172 + i * 52);
    });
    if (flash.current > 0) drawBanner(ctx, COPY.cleared, BW / 2, H / 2, 24, prefersReducedMotion() ? 1 : Math.min(1, flash.current * 2));
  }, []);
  const canvas = useGameCanvas(W, H, () => draw());

  const sync = () => {
    const s = st.current;
    setHud((h) => (h.score === s.score && h.lines === s.lines && h.level === s.level ? h : { score: s.score, lines: s.lines, level: s.level }));
  };
  const afterLock = (prevLevel: number) => {
    const s = st.current;
    if (s.lastClear) {
      flash.current = 0.9;
      blip(s.lastClear >= 4 ? 1320 : 990, 0.14, 'triangle');
      setAnnounce(s.level > prevLevel ? `${COPY.cleared} ${COPY.levelUp}` : COPY.cleared);
    } else blip(220, 0.03);
    if (s.over) game.end(s.score);
  };

  const reset = () => {
    st.current = createStacks(freshSeed());
    fall.current = 0;
    flash.current = 0;
    setAnnounce(null);
    sync();
    game.start();
  };

  useRaf((dt) => {
    const s = st.current;
    flash.current = Math.max(0, flash.current - dt);
    fall.current += dt;
    if (fall.current >= gravity(s.level)) {
      fall.current = 0;
      const lv = s.level;
      if (drop(s) === 'locked') afterLock(lv);
    }
    sync();
    draw();
  }, game.phase === 'playing');
  useEffect(() => draw(), [game.phase, draw]);

  const act = (a: Act) => {
    if (game.phaseRef.current !== 'playing') return;
    const s = st.current;
    const lv = s.level;
    if (a === 'left') move(s, -1);
    else if (a === 'right') move(s, 1);
    else if (a === 'rot' || a === 'ccw') {
      if (rotate(s, a === 'rot' ? 1 : -1)) blip(660, 0.03);
    } else if (a === 'soft') {
      fall.current = 0;
      if (drop(s, true) === 'locked') afterLock(lv);
    } else {
      hardDrop(s);
      fall.current = 0;
      afterLock(lv);
    }
    sync();
    draw();
  };

  return (
    <GameShell
      title="IYS STACKS"
      scoreId="stacks"
      game={game}
      score={hud.score}
      stats={[
        { label: 'LEVEL', value: hud.level },
        { label: 'LINES', value: hud.lines },
      ]}
      help="← → / A D move · ↑ / W / X rotate (Z = other way) · ↓ / S soft drop · Space hard drop · P pause. 10 lines = LEVEL UP."
      touchHelp="◀ ▶ move · ↻ rotate · ▼ soft drop · DROP hard drop. Fill rows to clear them."
      intro={
        <>
          <p>Fill a whole row to fold it away. Four rows at once = big drop points.</p>
          <p>Arrows to move, ↑ rotate, Space drops</p>
        </>
      }
      onStart={reset}
      props={props}
      announce={announce}
      keys={(e, down) => {
        const a = KEYS[e.key];
        if (!a) return false;
        if (down && !(e.repeat && (a === 'hard' || a === 'rot' || a === 'ccw'))) act(a);
        return true;
      }}
      touch={
        <>
          <PadButton label="◀" aria="Move left" onDown={() => repeat.start(() => act('left'))} onUp={repeat.stop} />
          <PadButton label="↻" aria="Rotate" onDown={() => act('rot')} />
          <PadButton label="▶" aria="Move right" onDown={() => repeat.start(() => act('right'))} onUp={repeat.stop} />
          <PadButton label="▼" aria="Soft drop" onDown={() => repeat.start(() => act('soft'))} onUp={repeat.stop} />
          <PadButton className="pad--go" label="DROP" aria="Hard drop" onDown={() => act('hard')} />
        </>
      }
    >
      <div className="game__fit" ref={canvas.wrap}>
        <canvas ref={canvas.canvas} role="img" aria-label={`Stacks board, level ${hud.level}, ${hud.lines} lines`} />
      </div>
    </GameShell>
  );
}
