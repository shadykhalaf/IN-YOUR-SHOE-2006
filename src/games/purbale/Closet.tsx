import { useRef, useState } from 'react';
import { blip } from '../../lib/sound';
import { GameShell, useGamePhase, type GameProps } from '../shared/GameShell';
import { useRaf } from '../shared/loop';
import { freshSeed, makeRng } from '../shared/rng';
import { checkLook, CLOSET_HEARTS, CLOSET_ROUNDS, closetPoints, closetRound, SLOT_LABEL, type ClosetRound, type Slot } from './logic';
import { Outfit, PIECE_NAME, Swatch } from './Outfit';

/** CATCHY CLOSET: copy the target look before the timer runs out. */
export default function Closet(props: GameProps) {
  const game = useGamePhase('purbale-closet');
  const rng = useRef(makeRng(freshSeed()));
  const [round, setRound] = useState<ClosetRound>(() => closetRound(rng.current, 1));
  const [picks, setPicks] = useState<Partial<Record<Slot, string>>>({});
  const [hearts, setHearts] = useState(CLOSET_HEARTS);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(round.time);
  const [note, setNote] = useState<string | null>(null);
  const timeLeft = useRef(round.time);

  const nextRound = (n: number) => {
    const r = closetRound(rng.current, n);
    setRound(r);
    setPicks({});
    timeLeft.current = r.time;
    setLeft(r.time);
  };
  const reset = () => {
    rng.current = makeRng(freshSeed());
    setHearts(CLOSET_HEARTS);
    setScore(0);
    setNote(null);
    nextRound(1);
    game.start();
  };

  const judge = (timedOut: boolean) => {
    const res = checkLook(round, picks);
    if (res.perfect && !timedOut) {
      const total = score + closetPoints(round, timeLeft.current);
      setScore(total);
      blip(990, 0.12, 'triangle', 1480);
      if (round.n >= CLOSET_ROUNDS) return game.end(total, true);
      setNote(`PERFECT FIT! Round ${round.n + 1}`);
      return nextRound(round.n + 1);
    }
    const h = hearts - 1;
    setHearts(h);
    blip(220, 0.2, 'square', 140);
    if (h <= 0) return game.end(score);
    setNote(timedOut ? 'TIME’S UP! Next look' : `ALMOST: ${res.correct}/${res.total} right. Next look`);
    nextRound(Math.min(CLOSET_ROUNDS, round.n + 1));
  };

  useRaf((dt) => {
    timeLeft.current -= dt;
    const shown = Math.max(0, Math.ceil(timeLeft.current));
    setLeft(shown);
    if (timeLeft.current <= 0) judge(true);
  }, game.phase === 'playing');

  const playing = game.phase === 'playing';
  const targetText = round.slots.map((s) => PIECE_NAME[s][round.target[s]!]).join(' · ');
  return (
    <GameShell
      title="CATCHY CLOSET"
      scoreId="purbale-closet"
      game={game}
      score={score}
      stats={[
        { label: 'ROUND', value: `${round.n}/${CLOSET_ROUNDS}` },
        { label: 'HEARTS', value: '♥'.repeat(Math.max(0, hearts)) || '0' },
        { label: 'TIME', value: left },
      ]}
      help="Copy the TARGET look: pick one piece per row, then CHECK THE LOOK. Perfect = points + time bonus; a miss or time-out costs a heart. 10 looks to win."
      intro={<p>Catchy wants that exact fit. Copy the target before the timer runs out. No prices, just style.</p>}
      onStart={reset}
      props={{ ...props }}
      wonTitle="CLOSET QUEEN!!"
      announce={note}
      stageClass="game__stage--dom"
    >
      <div className="closet">
        <div className="closet__looks">
          <figure>
            <Outfit size={props.compact ? 150 : 180} look={round.target} label={`Target look: ${targetText}`} />
            <figcaption>
              <b>TARGET</b>
              <small data-testid="closet-target">{targetText}</small>
            </figcaption>
          </figure>
          <figure>
            <Outfit size={props.compact ? 150 : 180} look={picks} label="Your look" />
            <figcaption>
              <b>YOU</b>
              <small>{round.slots.map((s) => (picks[s] ? PIECE_NAME[s][picks[s]!] : `pick a ${SLOT_LABEL[s].toLowerCase()}`)).join(' · ')}</small>
            </figcaption>
          </figure>
        </div>
        {note && <p className="closet__note">{note}</p>}
        <div className="closet__rows">
          {round.slots.map((s) => (
            <fieldset key={s} className="closet__row">
              <legend>{SLOT_LABEL[s]}</legend>
              {round.options[s].map((o) => (
                <button key={o} type="button" className="closet__opt" aria-pressed={picks[s] === o} disabled={!playing} onClick={() => setPicks((p) => ({ ...p, [s]: o }))}>
                  <Swatch slot={s} id={o} />
                  <span>{PIECE_NAME[s][o]}</span>
                </button>
              ))}
            </fieldset>
          ))}
        </div>
        <div className="closet__go">
          <div className="closet__timer" aria-hidden="true">
            <span style={{ width: `${(left / round.time) * 100}%` }} />
          </div>
          <button type="button" className="btn btn--go" disabled={!playing || round.slots.some((s) => !picks[s])} onClick={() => judge(false)}>
            CHECK THE LOOK
          </button>
        </div>
      </div>
    </GameShell>
  );
}
