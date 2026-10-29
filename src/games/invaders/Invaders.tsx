import { useCallback, useEffect, useRef, useState } from 'react';
import { blip } from '../../lib/sound';
import { prefersReducedMotion } from '../../lib/motion';
import { drawBanner, drawPjoy, drawSock, drawSparkle, IYS, roundRect } from '../shared/art';
import { drawCatchy } from '../shared/catchy';
import { COPY, GameShell, PadButton, useGamePhase, type GameProps } from '../shared/GameShell';
import { useGameCanvas, useRaf } from '../shared/loop';
import { freshSeed } from '../shared/rng';
import { createInvaders, H, PLAYER_Y, stepInvaders, W, WAVES, type Foe, type InvState } from './logic';

function eyes(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  for (const ox of [-s * 0.3, s * 0.3]) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x + ox, y, s * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = IYS.ink;
    ctx.beginPath();
    ctx.arc(x + ox, y + s * 0.06, s * 0.11, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFoe(ctx: CanvasRenderingContext2D, f: Foe, t: number) {
  const wob = prefersReducedMotion() ? 0 : Math.sin(t * 6 + f.hx) * 2;
  const { x } = f;
  const y = f.y + wob;
  ctx.save();
  ctx.strokeStyle = IYS.ink;
  ctx.lineWidth = 1.5;
  if (f.kind === 'sock') {
    drawSock(ctx, x - 11, y - 14, 26, f.hx % 80 < 40 ? IYS.coral : IYS.teal, '#fff');
    eyes(ctx, x - 2, y - 5, 10);
  } else if (f.kind === 'blob') {
    ctx.fillStyle = f.hp < f.max ? '#d1b7ff' : IYS.purple;
    ctx.beginPath();
    ctx.moveTo(x - 14, y + 10);
    ctx.quadraticCurveTo(x - 16, y - 14, x, y - 14);
    ctx.quadraticCurveTo(x + 16, y - 14, x + 14, y + 10);
    for (let i = 0; i < 4; i++) ctx.quadraticCurveTo(x + 10 - i * 7, y + 16, x + 7 - i * 7, y + 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    eyes(ctx, x, y - 3, 12);
  } else if (f.kind === 'closet') {
    ctx.fillStyle = f.hp < f.max ? '#f0c69a' : '#c98a52';
    ctx.fillRect(x - 13, y - 15, 26, 30);
    ctx.strokeRect(x - 13, y - 15, 26, 30);
    ctx.beginPath();
    ctx.moveTo(x, y - 15);
    ctx.lineTo(x, y + 15);
    ctx.stroke();
    eyes(ctx, x, y - 5, 12);
    ctx.fillStyle = IYS.ink;
    ctx.fillRect(x - 6, y + 6, 12, 3);
  } else if (f.kind === 'tag') {
    ctx.fillStyle = IYS.yellow;
    ctx.beginPath();
    ctx.moveTo(x - 14, y - 9);
    ctx.lineTo(x + 6, y - 9);
    ctx.lineTo(x + 15, y);
    ctx.lineTo(x + 6, y + 9);
    ctx.lineTo(x - 14, y + 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x + 7, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    eyes(ctx, x - 5, y - 1, 9);
  } else {
    // LINT KING: an original laundry-basket boss with a lint crown
    const enraged = f.hp < f.max / 2;
    ctx.fillStyle = enraged ? '#ff8a6b' : '#e8b47f';
    roundRect(ctx, x - 46, y - 22, 92, 50, 10);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#a0663a';
    for (let i = -38; i <= 38; i += 10) {
      ctx.beginPath();
      ctx.moveTo(x + i, y - 18);
      ctx.lineTo(x + i, y + 24);
      ctx.stroke();
    }
    ctx.fillStyle = '#b7a9d6';
    ctx.strokeStyle = IYS.ink;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(x + i * 12, y - 26 - (i % 2 ? 6 : 0), 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    eyes(ctx, x, y - 4, 26);
    ctx.fillStyle = IYS.ink;
    ctx.beginPath();
    ctx.arc(x, y + 12, 9, 0, Math.PI);
    ctx.fill();
    // HP bar
    ctx.fillStyle = 'rgba(0,0,0,.5)';
    ctx.fillRect(40, 24, W - 80, 8);
    ctx.fillStyle = IYS.coral;
    ctx.fillRect(40, 24, ((W - 80) * f.hp) / f.max, 8);
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(40, 24, W - 80, 8);
  }
  ctx.restore();
}

/** Catchy's Y2K UFO. */
function drawUfo(ctx: CanvasRenderingContext2D, x: number, y: number, blink: boolean, t: number) {
  if (blink) return;
  ctx.save();
  ctx.fillStyle = 'rgba(191,230,255,.55)';
  ctx.strokeStyle = IYS.ink;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y - 4, 18, Math.PI, 0);
  ctx.fill();
  ctx.restore();
  drawCatchy(ctx, x, y - 12, 26);
  ctx.save();
  ctx.strokeStyle = IYS.ink;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y - 4, 18, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = '#c9d4e3';
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 28, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = (Math.floor(t * 8) + i) % 2 ? IYS.yellow : IYS.coral;
    ctx.beginPath();
    ctx.arc(x - 18 + i * 9, y + 3, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export default function Invaders(props: GameProps) {
  const game = useGamePhase('invaders');
  const st = useRef<InvState>(createInvaders(freshSeed()));
  const held = useRef({ left: false, right: false, fire: false });
  const banner = useRef<{ text: string; t: number } | null>(null);
  const [hud, setHud] = useState({ score: 0, lives: 3, wave: 1 });
  const [announce, setAnnounce] = useState<string | null>(null);

  const draw = useCallback(() => {
    const ctx = canvas.ctx();
    if (!ctx) return;
    const s = st.current;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#120c3a');
    g.addColorStop(1, '#3a1d6e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const still = prefersReducedMotion();
    for (let i = 0; i < 40; i++) {
      const y = (i * 97 + (still ? 0 : s.time * (20 + (i % 3) * 25))) % H;
      if (i % 9 === 0) drawSparkle(ctx, (i * 53) % W, y, 4, '#fff');
      else {
        ctx.fillStyle = i % 4 ? 'rgba(255,255,255,.7)' : IYS.pink;
        ctx.fillRect((i * 53) % W, y, 2, 2);
      }
    }
    for (const p of s.powers) {
      ctx.save();
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 8;
      if (p.kind === 'pjoy') drawPjoy(ctx, p.x - 11, p.y - 11, 22, IYS.pink, 'hearts');
      else drawSock(ctx, p.x - 9, p.y - 11, 22, IYS.yellow, IYS.coral);
      ctx.restore();
    }
    for (const f of s.foes) drawFoe(ctx, f, s.time);
    ctx.fillStyle = IYS.yellow;
    for (const sh of s.shots) ctx.fillRect(sh.x - 1.5, sh.y - 7, 3, 12);
    for (const b of s.bombs) {
      ctx.fillStyle = IYS.coral;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    drawUfo(ctx, s.px, PLAYER_Y, s.invuln > 0 && Math.floor(s.time * 12) % 2 === 0, s.time);
    ctx.font = 'bold 11px Tahoma, Verdana, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff';
    const tags = [s.multi > 0 && `PJOY x3 ${Math.ceil(s.multi)}`, s.rapid > 0 && `SOCK FAST ${Math.ceil(s.rapid)}`].filter(Boolean).join('  ');
    if (tags) ctx.fillText(tags, 8, H - 8);
    if (banner.current) drawBanner(ctx, banner.current.text, W / 2, H / 2, 22, Math.min(1, banner.current.t * 1.5));
  }, []);
  const canvas = useGameCanvas(W, H, () => draw());

  const reset = () => {
    st.current = createInvaders(freshSeed());
    held.current = { left: false, right: false, fire: false };
    banner.current = { text: `WAVE 1 / ${WAVES}`, t: 1.5 };
    setAnnounce(null);
    setHud({ score: 0, lives: 3, wave: 1 });
    game.start();
  };
  useEffect(() => {
    if (game.phase !== 'playing') held.current = { left: false, right: false, fire: false };
  }, [game.phase]);

  useRaf((dt) => {
    const s = st.current;
    if (banner.current && (banner.current.t -= dt) <= 0) banner.current = null;
    const h = held.current;
    for (const ev of stepInvaders(s, dt, (h.right ? 1 : 0) - (h.left ? 1 : 0), h.fire)) {
      if (ev === 'shot') blip(1400, 0.03, 'square', 900, 0.12);
      else if (ev === 'kill') blip(300, 0.08, 'sawtooth', 120);
      else if (ev === 'hit') blip(600, 0.03);
      else if (ev === 'power') blip(880, 0.2, 'triangle', 1760);
      else if (ev === 'hurt') blip(200, 0.3, 'sawtooth', 60);
      else if (ev === 'wave') {
        banner.current = { text: COPY.nextWave, t: 1.8 };
        setAnnounce(COPY.nextWave);
      } else if (ev === 'boss') {
        banner.current = { text: 'LINT KING!!', t: 1.8 };
        setAnnounce('Wave 5: the LINT KING');
      } else if (ev === 'win' || ev === 'over') game.end(s.score, s.won);
    }
    setHud((p) => (p.score === s.score && p.lives === s.lives && p.wave === s.wave ? p : { score: s.score, lives: s.lives, wave: s.wave }));
    draw();
  }, game.phase === 'playing');
  useEffect(() => draw(), [game.phase, draw]);

  const hold = (k: 'left' | 'right' | 'fire', on: boolean) => {
    held.current[k] = on && game.phaseRef.current === 'playing';
  };

  return (
    <GameShell
      title="CATCHY INVADERS"
      scoreId="invaders"
      game={game}
      score={hud.score}
      stats={[
        { label: 'LIVES', value: '♥'.repeat(Math.max(0, hud.lives)) || '0' },
        { label: 'WAVE', value: `${hud.wave}/${WAVES}` },
      ]}
      help="← → / A D fly · Space, ↑ or W fire (hold) · PJOY = triple shot · SOCK = faster fire · P pause. Beat 5 waves and the LINT KING."
      touchHelp="Hold LEFT / RIGHT to fly, hold FIRE to shoot. PJOY = triple shot, SOCK = faster fire."
      intro={
        <>
          <p>Runaway socks, laundry blobs, closet creatures and tag gremlins are invading. Wave 5: the LINT KING.</p>
          <p>← → fly · Space fire</p>
        </>
      }
      onStart={reset}
      props={props}
      announce={announce}
      wonTitle="LINT KING DEFEATED!!"
      keys={(e, down) => {
        const k = e.key;
        const which = k === 'ArrowLeft' || k === 'a' || k === 'A' ? 'left' : k === 'ArrowRight' || k === 'd' || k === 'D' ? 'right' : k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W' ? 'fire' : null;
        if (!which) return false;
        hold(which, down);
        return true;
      }}
      touch={
        <>
          <PadButton className="pad--wide" label="◀ LEFT" aria="Fly left" onDown={() => hold('left', true)} onUp={() => hold('left', false)} />
          <PadButton className="pad--wide pad--go" label="FIRE" aria="Fire" onDown={() => hold('fire', true)} onUp={() => hold('fire', false)} />
          <PadButton className="pad--wide" label="RIGHT ▶" aria="Fly right" onDown={() => hold('right', true)} onUp={() => hold('right', false)} />
        </>
      }
    >
      <div className="game__fit" ref={canvas.wrap}>
        <canvas ref={canvas.canvas} role="img" aria-label={`Invaders, wave ${hud.wave} of ${WAVES}, ${hud.lives} lives`} />
      </div>
    </GameShell>
  );
}
