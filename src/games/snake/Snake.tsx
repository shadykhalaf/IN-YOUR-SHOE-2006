import { useCallback, useEffect, useRef, useState } from 'react';
import { blip } from '../../lib/sound';
import { prefersReducedMotion } from '../../lib/motion';
import { drawPjoy, drawSock, IYS, roundRect } from '../shared/art';
import { drawCatchy } from '../shared/catchy';
import { DPad, GameShell, keyDir, useGamePhase, type GameProps } from '../shared/GameShell';
import { makeTicker, useGameCanvas, useRaf } from '../shared/loop';
import { freshSeed } from '../shared/rng';
import { createSnake, step, stepInterval, turn, type Dir, type SnakeState } from './logic';

const CELL = 20;
const COLS = 18;
const ROWS = 18;
const W = COLS * CELL;
const H = ROWS * CELL;
const BODY = [IYS.coral, IYS.sky, IYS.yellow, IYS.pink];

export default function Snake(props: GameProps) {
  const game = useGamePhase('snake');
  const st = useRef<SnakeState>(createSnake(freshSeed(), COLS, ROWS));
  const ticker = useRef(makeTicker());
  const t = useRef(0);
  const [score, setScore] = useState(0);
  const [len, setLen] = useState(3);

  const draw = useCallback(() => {
    const ctx = canvas.ctx();
    if (!ctx) return;
    const s = st.current;
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++) {
        ctx.fillStyle = (x + y) % 2 ? '#5fbf45' : '#6fd145';
        ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      }
    drawSock(ctx, s.food.x * CELL + 2, s.food.y * CELL + 1, CELL - 2, IYS.coral, '#fff');
    if (s.bonus && (s.bonus.ttl > 10 || prefersReducedMotion() || Math.floor(t.current * 6) % 2 === 0)) drawPjoy(ctx, s.bonus.x * CELL, s.bonus.y * CELL, CELL, IYS.pink, 'hearts');
    for (let i = s.snake.length - 1; i >= 1; i--) {
      const c = s.snake[i]!;
      ctx.fillStyle = BODY[i % BODY.length]!;
      roundRect(ctx, c.x * CELL + 2, c.y * CELL + 2, CELL - 4, CELL - 4, 5);
      ctx.fill();
      ctx.strokeStyle = IYS.ink;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.fillRect(c.x * CELL + 4, c.y * CELL + 8, CELL - 8, 3);
    }
    const h = s.snake[0]!;
    drawCatchy(ctx, h.x * CELL + CELL / 2, h.y * CELL + CELL / 2, CELL * 1.45);
  }, []);
  const canvas = useGameCanvas(W, H, () => draw());

  const reset = () => {
    st.current = createSnake(freshSeed(), COLS, ROWS);
    ticker.current = makeTicker();
    setScore(0);
    setLen(3);
    game.start();
  };

  useRaf((dt) => {
    t.current += dt;
    const s = st.current;
    ticker.current(dt, stepInterval(s.eaten), () => {
      const ev = step(s);
      if (ev === 'sock') blip(880, 0.05);
      if (ev === 'pjoy') blip(1320, 0.12, 'triangle');
      if (ev === 'dead') {
        game.end(s.score);
        return false;
      }
    });
    setScore(s.score);
    setLen(s.snake.length);
    draw();
  }, game.phase === 'playing');
  useEffect(() => draw(), [game.phase, draw]);

  const dir = (d: Dir) => game.phaseRef.current === 'playing' && turn(st.current, d);

  return (
    <GameShell
      title="CATCHY SNAKE"
      scoreId="snake"
      game={game}
      score={score}
      stats={[{ label: 'LENGTH', value: len }]}
      help="Arrows or WASD steer Catchy. Socks +10, Pjoy bonus +50 (it vanishes!). Walls and your own trail end the run. P pauses."
      touchHelp="Use the D-pad to steer. Socks +10, Pjoy +50. Avoid walls and your own trail."
      intro={
        <>
          <p>Lead the sock trail. Every sock makes it longer and faster.</p>
          <p>Arrows / WASD · D-pad on phones</p>
        </>
      }
      onStart={reset}
      props={props}
      keys={(e, down) => {
        const d = keyDir(e.key);
        if (!d) return false;
        if (down) dir(d);
        return true;
      }}
      touch={<DPad onDir={dir} />}
    >
      <div className="game__fit" ref={canvas.wrap}>
        <canvas ref={canvas.canvas} role="img" aria-label={`Snake board, length ${len}, score ${score}`} />
      </div>
    </GameShell>
  );
}
