import { useEffect, useMemo, useRef, useState } from 'react';
import { blip } from '../../lib/sound';
import { CatchySticker } from '../shared/catchy';
import { GameShell, useGamePhase, type GameProps } from '../shared/GameShell';
import { useRaf } from '../shared/loop';
import { freshSeed, makeRng } from '../shared/rng';
import { createPairs, flip, PAIRS, pairsScore, settle, type Difficulty, type PairsState } from './logic';
import { pairPictures } from './media';

/** PJOY PAIRS: memory with real Pjoy, sock and IYS pictures. */
export default function Pairs(props: GameProps) {
  const game = useGamePhase('purbale-pairs');
  const pics = useMemo(pairPictures, []);
  const [diff, setDiff] = useState<Difficulty>('normal');
  const [st, setSt] = useState<PairsState>(() => createPairs(makeRng(freshSeed()), Object.keys(pics), PAIRS.normal.pairs));
  const [, bump] = useState(0);
  const secs = useRef(0);
  const [shown, setShown] = useState(0);
  const hide = useRef<number | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const clearHide = () => {
    if (hide.current !== null) window.clearTimeout(hide.current);
    hide.current = null;
  };
  useEffect(() => clearHide, []);

  const reset = () => {
    clearHide();
    setSt(createPairs(makeRng(freshSeed()), Object.keys(pics), PAIRS[diff].pairs));
    secs.current = 0;
    setShown(0);
    setNote(null);
    game.start();
  };

  useRaf((dt) => {
    secs.current += dt;
    const s = Math.floor(secs.current);
    setShown((p) => (p === s ? p : s));
  }, game.phase === 'playing');

  const turn = (i: number) => {
    if (game.phaseRef.current !== 'playing') return;
    clearHide();
    const ev = flip(st, i);
    if (!ev) return;
    bump((n) => n + 1);
    if (ev === 'flip') blip(700, 0.03);
    else if (ev === 'miss') {
      blip(260, 0.08);
      setNote('Not a pair, try again');
      hide.current = window.setTimeout(() => {
        settle(st);
        bump((n) => n + 1);
      }, 850);
    } else if (ev === 'match') {
      blip(1100, 0.1, 'triangle');
      setNote(`PAIR! ${st.matched}/${st.pairs}`);
    } else {
      setNote('ALL PAIRED!!');
      game.end(pairsScore(st.pairs, st.moves, secs.current, PAIRS[diff].mult), true);
    }
  };

  const cols = PAIRS[diff].cols;
  return (
    <GameShell
      title="PJOY PAIRS"
      scoreId="purbale-pairs"
      game={game}
      score={game.result?.score ?? (st.matched ? pairsScore(st.matched, st.moves, shown, PAIRS[diff].mult) : 0)}
      stats={[
        { label: 'PAIRS', value: `${st.matched}/${st.pairs}` },
        { label: 'MOVES', value: st.moves },
        { label: 'TIME', value: `${shown}s` },
      ]}
      help="Turn two cards at a time (click, tap, or Tab + Enter). Match every Pjoy, sock and IYS pair. Fewer moves and less time = more points; Hard pays double."
      intro={
        <>
          <p>Flip two cards. Same picture = a pair. Find them all!</p>
          <fieldset className="pairs__diff">
            <legend>Difficulty</legend>
            {(Object.keys(PAIRS) as Difficulty[]).map((d) => (
              <label key={d}>
                <input type="radio" name="pairs-diff" value={d} checked={diff === d} onChange={() => setDiff(d)} /> {d.toUpperCase()} ({PAIRS[d].pairs} pairs)
              </label>
            ))}
          </fieldset>
        </>
      }
      onStart={reset}
      props={props}
      wonTitle="ALL PAIRED!!"
      announce={note}
      stageClass="game__stage--dom"
    >
      <ul className="pairs" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} aria-label="Cards">
        {st.cards.map((c, i) => {
          const pic = pics[c.key]!;
          const up = c.up || c.matched;
          return (
            <li key={i}>
              <button type="button" className={`pcard${up ? ' is-up' : ''}${c.matched ? ' is-matched' : ''}`} onClick={() => turn(i)} aria-label={up ? `Card ${i + 1}: ${pic.alt}${c.matched ? ' (paired)' : ''}` : `Card ${i + 1}, face down`} aria-disabled={c.matched || undefined}>
                {up ? <img src={pic.src} alt="" draggable={false} /> : <CatchySticker size={34} />}
              </button>
            </li>
          );
        })}
      </ul>
    </GameShell>
  );
}
