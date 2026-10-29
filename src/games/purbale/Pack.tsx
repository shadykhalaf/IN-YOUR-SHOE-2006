import { useRef, useState } from 'react';
import { blip } from '../../lib/sound';
import { GameShell, useGamePhase, type GameProps } from '../shared/GameShell';
import { useRaf } from '../shared/loop';
import { freshSeed, makeRng } from '../shared/rng';
import { checkPack, PACK_STRIKES, packBox, packPoints, type PackBox } from './logic';
import { PACK_ITEMS } from './media';

const KINDS = PACK_ITEMS.map((i) => i.id);
const ITEM = Object.fromEntries(PACK_ITEMS.map((i) => [i.id, i]));

function Pic({ id, size = 44 }: { id: string; size?: number }) {
  const it = ITEM[id]!;
  return it.src ? <img src={it.src} alt="" width={size} height={size} draggable={false} /> : <span className="pack__ph" style={{ width: size, height: size }} />;
}

/** PACK THE DROP: put exactly what the pack list shows into the box, then PACK. */
export default function Pack(props: GameProps) {
  const game = useGamePhase('purbale-pack');
  const rng = useRef(makeRng(freshSeed()));
  const [box, setBox] = useState<PackBox>(() => packBox(rng.current, 1, KINDS));
  const [packed, setPacked] = useState<string[]>([]);
  const [strikes, setStrikes] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(0);
  const [left, setLeft] = useState(box.time);
  const [note, setNote] = useState<string | null>(null);
  const timeLeft = useRef(box.time);

  const next = (n: number) => {
    const b = packBox(rng.current, n, KINDS);
    setBox(b);
    setPacked([]);
    timeLeft.current = b.time;
    setLeft(b.time);
  };
  const reset = () => {
    rng.current = makeRng(freshSeed());
    setStrikes(0);
    setScore(0);
    setDone(0);
    setNote(null);
    next(1);
    game.start();
  };

  const finish = (timedOut: boolean) => {
    if (!timedOut && checkPack(box.list, packed)) {
      const total = score + packPoints(box, timeLeft.current);
      setScore(total);
      setDone((d) => d + 1);
      setNote(`PACKED! Box ${box.n + 1} is faster`);
      blip(880, 0.12, 'triangle', 1320);
      return next(box.n + 1);
    }
    const s = strikes + 1;
    setStrikes(s);
    blip(200, 0.25, 'square', 120);
    if (s >= PACK_STRIKES) return game.end(score);
    setNote(timedOut ? 'TOO SLOW! New box' : 'WRONG ITEMS! New box');
    next(box.n);
  };

  useRaf((dt) => {
    timeLeft.current -= dt;
    setLeft(Math.max(0, Math.ceil(timeLeft.current)));
    if (timeLeft.current <= 0) finish(true);
  }, game.phase === 'playing');

  const playing = game.phase === 'playing';
  const listText = Object.entries(box.list)
    .map(([k, q]) => `${q} × ${ITEM[k]!.label}`)
    .join(', ');
  return (
    <GameShell
      title="PACK THE DROP"
      scoreId="purbale-pack"
      game={game}
      score={score}
      stats={[
        { label: 'BOXES', value: done },
        { label: 'MISSES', value: `${strikes}/${PACK_STRIKES}` },
        { label: 'TIME', value: left },
      ]}
      help="Read the PACK LIST, tap shelf items to put them in the box (tap an item in the box to take it out), then PACK IT. Exact items and amounts only. 3 misses and it’s over; every box is faster."
      intro={<p>Help Catchy pack the drop: exactly what the list shows, before the timer runs out. Pretend boxes only: no real orders, no customer info.</p>}
      onStart={reset}
      props={props}
      announce={note}
      stageClass="game__stage--dom"
    >
      <div className="pack">
        <section className="pack__list" aria-labelledby="pack-list-h">
          <h3 id="pack-list-h">PACK LIST · BOX {box.n}</h3>
          <ul data-testid="pack-list" aria-label={`Pack list: ${listText}`}>
            {Object.entries(box.list).map(([k, q]) => (
              <li key={k} data-item={k} data-qty={q}>
                <Pic id={k} size={36} />
                <span>
                  {q} × {ITEM[k]!.label}
                </span>
              </li>
            ))}
          </ul>
          <div className="closet__timer" aria-hidden="true">
            <span style={{ width: `${(left / box.time) * 100}%` }} />
          </div>
        </section>
        <section className="pack__box" aria-labelledby="pack-box-h">
          <h3 id="pack-box-h">
            THE BOX ({packed.length})
          </h3>
          {packed.length === 0 ? (
            <p className="pack__empty">empty: tap the shelf ↓</p>
          ) : (
            <ul>
              {packed.map((k, i) => (
                <li key={`${k}-${i}`}>
                  <button type="button" className="pack__item" disabled={!playing} onClick={() => setPacked((p) => p.filter((_, j) => j !== i))} aria-label={`Take ${ITEM[k]!.label} out of the box`}>
                    <Pic id={k} size={34} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="btn btn--go pack__go" disabled={!playing || !packed.length} onClick={() => finish(false)}>
            PACK IT ›
          </button>
        </section>
        {note && <p className="closet__note">{note}</p>}
        <section className="pack__shelf" aria-labelledby="pack-shelf-h">
          <h3 id="pack-shelf-h">SHELF</h3>
          <ul>
            {box.shelf.map((k) => (
              <li key={k}>
                <button type="button" className="pack__item pack__item--shelf" disabled={!playing} onClick={() => setPacked((p) => (p.length < 8 ? [...p, k] : p))} aria-label={`Add ${ITEM[k]!.label}`}>
                  <Pic id={k} />
                  <span>{ITEM[k]!.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </GameShell>
  );
}
