import { lazy, Suspense, useState } from 'react';
import { Busy } from '../../components/shop/Busy';
import { useClaimCenter } from '../../shells/mobile/chrome';
import { CatchySticker } from '../shared/catchy';
import { COPY, type GameProps } from '../shared/GameShell';
import { useBest, type ScoreId } from '../shared/scores';
import '../shared/games.css';
import './purbale.css';

const Closet = lazy(() => import('./Closet'));
const Pairs = lazy(() => import('./Pairs'));
const Pack = lazy(() => import('./Pack'));

type Mode = 'closet' | 'pairs' | 'pack';
const MINIS: { id: Mode; score: ScoreId; title: string; blurb: string }[] = [
  { id: 'closet', score: 'purbale-closet', title: 'CATCHY CLOSET', blurb: 'Copy the target look: top, bottom, socks and an extra. 10 looks, 3 hearts.' },
  { id: 'pairs', score: 'purbale-pairs', title: 'PJOY PAIRS', blurb: 'Memory with real Pjoys, socks and IYS prints. Easy, Normal or Hard.' },
  { id: 'pack', score: 'purbale-pack', title: 'PACK THE DROP', blurb: 'Pack exactly what the list shows before the timer runs out. Faster every box.' },
];

function Best({ id }: { id: ScoreId }) {
  const b = useBest(id);
  return <span className="gtile__best">BEST <b>{b || '-'}</b></span>;
}

/** PURBALE CATCHY: a little folder of three Catchy mini games. */
export default function PurbaleCatchy(props: GameProps) {
  const [mode, setMode] = useState<Mode | null>(null);
  useClaimCenter(props.compact && !mode ? { label: 'GAMES', run: props.onExit } : null);
  const inner: GameProps = { ...props, onExit: () => setMode(null), backLabel: 'PURBALE' };
  if (mode)
    return (
      <Suspense fallback={<Busy label="Loading game..." from="games" to="computer" />}>
        {mode === 'closet' ? <Closet {...inner} /> : mode === 'pairs' ? <Pairs {...inner} /> : <Pack {...inner} />}
      </Suspense>
    );
  return (
    <section className={`purbale${props.compact ? ' purbale--compact' : ''}`} aria-labelledby="purbale-h">
      <header className="purbale__head">
        <CatchySticker size={64} />
        <div>
          <h2 id="purbale-h">PURBALE CATCHY</h2>
          <p>Three little Catchy games. Pick one!</p>
        </div>
        <button type="button" className="btn btn--small purbale__back" onClick={props.onExit}>
          ◀ {COPY.back}
        </button>
      </header>
      <ul className="purbale__list">
        {MINIS.map((m) => (
          <li key={m.id} className="purbale__mini" data-mini={m.id}>
            <h3>{m.title}</h3>
            <p>{m.blurb}</p>
            <div className="gtile__row">
              <button type="button" className="btn btn--go gtile__play" onClick={() => setMode(m.id)} aria-label={`PLAY ${m.title}`} data-autofocus={m.id === 'closet' ? true : undefined}>
                {COPY.play}
              </button>
              <Best id={m.score} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
