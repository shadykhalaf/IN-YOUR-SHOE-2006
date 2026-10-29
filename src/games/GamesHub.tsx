import { GameIcon } from './GameIcon';
import { GAMES, type GameId, type GameMeta } from './registry';
import { CatchySticker } from './shared/catchy';
import { useBest } from './shared/scores';
import './shared/games.css';

function Best({ id, label }: { id: GameMeta['scores'][number]['id']; label: string }) {
  const best = useBest(id);
  return (
    <span className="gtile__best">
      {label} <b>{best || '-'}</b>
    </span>
  );
}

function ScoreRow({ id, label }: { id: GameMeta['scores'][number]['id']; label: string }) {
  const best = useBest(id);
  return (
    <li>
      <span>{label}</span> <b>{best || '-'}</b>
    </li>
  );
}

/** IYS GAMES folder: the six games, each with a PLAY button and its local best. */
export default function GamesHub({ onPlay, compact = false }: { onPlay: (id: GameId) => void; compact?: boolean }) {
  return (
    <div className={`gfolder${compact ? ' gfolder--compact' : ''}`}>
      <aside className="gfolder__side" aria-label="Game tasks">
        <section className="gfolder__box" aria-labelledby="gf-scores">
          <h3 id="gf-scores">MY HIGH SCORES</h3>
          <ul>
            {GAMES.flatMap((g) => g.scores.map((s) => <ScoreRow key={s.id} id={s.id} label={g.scores.length > 1 ? `${g.title.split(' ')[0]} ${s.label}` : g.title} />))}
          </ul>
        </section>
        <section className="gfolder__box" aria-labelledby="gf-about">
          <h3 id="gf-about">ABOUT</h3>
          <p>Saved on this device only. No accounts, nothing sent anywhere. Original IYS games, starring Catchy.</p>
        </section>
      </aside>
      <div className="gfolder__main">
        <div className="gfolder__head">
          <CatchySticker size={40} />
          <div>
            <h2>IYS GAMES</h2>
            <p>6 games · pick one and press PLAY xo</p>
          </div>
        </div>
        <ul className="gfolder__list" aria-label="IYS games">
          {GAMES.map((g) => (
            <li key={g.id} className="gtile" data-game-tile={g.id}>
              <GameIcon id={g.id} />
              <h3 className="gtile__title">{g.title}</h3>
              <p className="gtile__blurb">{g.blurb}</p>
              <div className="gtile__row">
                <button type="button" className="btn btn--go btn--small gtile__play" onClick={() => onPlay(g.id)} aria-label={`PLAY ${g.title}`}>
                  PLAY
                </button>
                {g.scores.map((s) => (
                  <Best key={s.id} id={s.id} label={s.label} />
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
