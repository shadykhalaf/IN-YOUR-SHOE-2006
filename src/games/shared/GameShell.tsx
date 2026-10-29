import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { blip, unlockAudio } from '../../lib/sound';
import { usePreferences } from '../../state/preferences';
import { useClaimCenter } from '../../shells/mobile/chrome';
import { CatchySticker } from './catchy';
import { RewardResult, RewardTeaser, useRunRewards } from './GameReward';
import { submitScore, useBest, type ScoreId } from './scores';
import './games.css';

/** What every game receives from its host (desktop window or mobile screen). */
export interface GameProps {
  /** false while the window is minimized / the screen is covered: the game must pause. */
  active: boolean;
  /** Back to the IYS GAMES folder. */
  onExit: () => void;
  /** Mobile layout: touch controls always shown, centre soft key = PLAY / PAUSE. */
  compact: boolean;
  /** Label of the way back (defaults to IYS GAMES). */
  backLabel?: string;
}

export type Phase = 'ready' | 'playing' | 'paused' | 'over';
export interface RunResult {
  score: number;
  best: number;
  isNew: boolean;
  won: boolean;
}

export const COPY = {
  play: 'PLAY',
  paused: 'PAUSED',
  over: 'GAME OVER :(',
  again: 'TRY AGAIN XD',
  newBest: 'NEW HIGH SCORE!!',
  levelUp: 'LEVEL UP',
  nextWave: 'NEXT WAVE',
  cleared: 'DROP CLEARED!',
  back: 'IYS GAMES',
} as const;

/** Phase machine + local high-score submit. Real-time game state stays in the game's own refs. */
export function useGamePhase(scoreId: ScoreId) {
  const [phase, setPhase] = useState<Phase>('ready');
  const [result, setResult] = useState<RunResult | null>(null);
  const ref = useRef(phase);
  ref.current = phase;
  const actions = useMemo(
    () => ({
      start: () => {
        setResult(null);
        ref.current = 'playing';
        setPhase('playing');
      },
      pause: () => {
        if (ref.current !== 'playing') return;
        ref.current = 'paused';
        setPhase('paused');
      },
      resume: () => {
        if (ref.current !== 'paused') return;
        ref.current = 'playing';
        setPhase('playing');
      },
      end: (score: number, won = false) => {
        if (ref.current === 'over') return;
        const r = submitScore(scoreId, score);
        ref.current = 'over';
        setResult({ score: Math.max(0, Math.floor(score)), ...r, won });
        setPhase('over');
        if (won || r.isNew) [660, 880, 1320].forEach((f, i) => window.setTimeout(() => blip(f, 0.1, 'triangle'), i * 80));
        else blip(260, 0.25, 'square', 120);
      },
    }),
    [scoreId],
  );
  return { phase, phaseRef: ref, result, ...actions };
}
export type GameControl = ReturnType<typeof useGamePhase>;

const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (t.tagName === 'BUTTON' || t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'A');

export function GameShell({
  title,
  scoreId,
  game,
  score,
  stats = [],
  help,
  touchHelp,
  intro,
  onStart,
  props,
  keys,
  touch,
  wonTitle = 'YOU DID IT!!',
  announce,
  children,
  className = '',
  stageClass = '',
}: {
  title: string;
  scoreId: ScoreId;
  game: GameControl;
  score: number;
  stats?: { label: string; value: ReactNode }[];
  /** Plain-text controls, always visible under the play area. */
  help: string;
  /** Shorter instructions for the mobile screen (touch controls). */
  touchHelp?: string;
  intro?: ReactNode;
  /** Reset the run and start playing (PLAY, RESTART, TRY AGAIN). */
  onStart: () => void;
  props: GameProps;
  /** Game keys, only while playing and only when the game has focus. Return true when handled. */
  keys?: (e: KeyboardEvent, down: boolean) => boolean;
  touch?: ReactNode;
  wonTitle?: string;
  /** Short live text (LEVEL UP, NEXT WAVE...) for screen readers. */
  announce?: string | null;
  children: ReactNode;
  className?: string;
  /** e.g. 'game__stage--dom' for DOM (non-canvas) games that scroll. */
  stageClass?: string;
}) {
  const { phase, result } = game;
  const best = useBest(scoreId);
  const sound = usePreferences((s) => s.sound);
  const titleId = useId();
  const helpId = useId();
  const stage = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLElement>(null);

  const rewards = useRunRewards(scoreId);
  const start = () => {
    rewards.newRun();
    onStart();
    requestAnimationFrame(() => stage.current?.focus({ preventScroll: true }));
  };
  const resume = () => {
    game.resume();
    requestAnimationFrame(() => stage.current?.focus({ preventScroll: true }));
  };
  const togglePause = () => (game.phaseRef.current === 'playing' ? game.pause() : resume());

  // Minimized window, covered screen or hidden tab → pause.
  const { pause } = game;
  useEffect(() => {
    if (!props.active) pause();
  }, [props.active, pause]);
  useEffect(() => {
    const onVis = () => document.hidden && pause();
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [pause]);

  useClaimCenter(props.compact ? { label: phase === 'playing' ? 'PAUSE' : phase === 'paused' ? 'RESUME' : phase === 'over' ? 'AGAIN' : COPY.play, run: () => (phase === 'playing' || phase === 'paused' ? togglePause() : start()) } : null);

  const onKey = (e: ReactKeyboardEvent, down: boolean) => {
    if (isTyping(e.target) && (e.key === ' ' || e.key === 'Enter')) return;
    const p = game.phaseRef.current;
    if (down && (e.key === 'p' || e.key === 'P') && (p === 'playing' || p === 'paused')) {
      e.preventDefault();
      return togglePause();
    }
    if (down && e.key === 'Escape' && p === 'playing') {
      e.preventDefault();
      return game.pause();
    }
    if (down && e.key === ' ' && (p === 'ready' || p === 'over') && !e.repeat) {
      e.preventDefault();
      return start();
    }
    if (p === 'playing' && keys?.(e.nativeEvent, down)) e.preventDefault();
  };

  const toggleSound = () => {
    const next = !usePreferences.getState().sound;
    usePreferences.getState().setSound(next);
    if (next) unlockAudio();
  };
  const live = phase === 'paused' ? COPY.paused : phase === 'over' ? (result?.won ? wonTitle : COPY.over) + (result?.isNew ? ` ${COPY.newBest}` : '') : announce ?? '';

  return (
    <section ref={root} className={`game ${className}${props.compact ? ' game--compact' : ''}`} aria-labelledby={titleId} data-phase={phase} data-score={score} onKeyDown={(e) => onKey(e, true)} onKeyUp={(e) => onKey(e, false)}>
      <header className="game__bar">
        <h2 className="game__title" id={titleId}>
          {title}
        </h2>
        <dl className="game__hud">
          <div>
            <dt>SCORE</dt>
            <dd data-testid="game-score">{score}</dd>
          </div>
          <div>
            <dt>BEST</dt>
            <dd>{Math.max(best, phase === 'over' ? result?.best ?? 0 : 0)}</dd>
          </div>
          {stats.map((s) => (
            <div key={s.label}>
              <dt>{s.label}</dt>
              <dd>{s.value}</dd>
            </div>
          ))}
        </dl>
        <div className="game__tools">
          <button type="button" className="btn btn--small" onClick={togglePause} disabled={phase !== 'playing' && phase !== 'paused'} aria-pressed={phase === 'paused'}>
            {phase === 'paused' ? 'Resume' : 'Pause'}
          </button>
          <button type="button" className="btn btn--small" onClick={start}>
            Restart
          </button>
          <button type="button" className="btn btn--small" onClick={toggleSound} aria-pressed={sound} aria-label={sound ? 'Sound on (turn off)' : 'Sound off (turn on)'}>
            {sound ? '♪ On' : '♪ Off'}
          </button>
          <button type="button" className="btn btn--small" onClick={props.onExit}>
            ◀ {props.backLabel ?? COPY.back}
          </button>
        </div>
      </header>
      <div ref={stage} className={`game__stage ${stageClass}`} tabIndex={0} role="group" aria-label={`${title} play area`} aria-describedby={helpId}>
        {children}
        {phase !== 'playing' && (
          <div className="game__overlay" data-overlay={phase}>
            <div className="game__card">
              {phase === 'ready' && (
                <>
                  <CatchySticker size={56} />
                  <p className="game__big">{title}</p>
                  {intro && <div className="game__intro">{intro}</div>}
                  <RewardTeaser r={rewards} />
                  <button type="button" className="btn btn--go game__cta" onClick={start} data-autofocus>
                    {COPY.play}
                  </button>
                </>
              )}
              {phase === 'paused' && (
                <>
                  <p className="game__big">{COPY.paused}</p>
                  <button type="button" className="btn btn--go game__cta" onClick={resume} data-autofocus>
                    Resume
                  </button>
                  <button type="button" className="btn" onClick={start}>
                    Restart
                  </button>
                </>
              )}
              {phase === 'over' && result && (
                <>
                  <p className="game__big">{result.won ? wonTitle : COPY.over}</p>
                  <p className="game__final">
                    SCORE <b>{result.score}</b> · BEST <b>{result.best}</b>
                  </p>
                  {result.isNew && <p className="game__new">{COPY.newBest}</p>}
                  <RewardResult key={rewards.runId} r={rewards} game={scoreId} result={result} />
                  <button type="button" className="btn btn--go game__cta" onClick={start} data-autofocus>
                    {COPY.again}
                  </button>
                  <button type="button" className="btn" onClick={props.onExit}>
                    ◀ {props.backLabel ?? COPY.back}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      {touch && (
        <div className={`game__touch${props.compact ? ' is-on' : ''}`} onContextMenu={(e) => e.preventDefault()}>
          {touch}
        </div>
      )}
      <p className="game__help" id={helpId}>
        {props.compact && touchHelp ? touchHelp : help}
      </p>
      <p className="sr-only" aria-live="polite">
        {live}
      </p>
    </section>
  );
}

/** One hold-able touch/mouse button for on-screen controls. */
export function PadButton({ label, aria, onDown, onUp, className = '' }: { label: ReactNode; aria: string; onDown: () => void; onUp?: () => void; className?: string }) {
  return (
    <button
      type="button"
      className={`pad ${className}`}
      aria-label={aria}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        onDown();
      }}
      onPointerUp={() => onUp?.()}
      onPointerCancel={() => onUp?.()}
      onLostPointerCapture={() => onUp?.()}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
          e.preventDefault();
          e.stopPropagation();
          onDown();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.stopPropagation();
          onUp?.();
        }
      }}
    >
      {label}
    </button>
  );
}

/** Four-way pad for grid games (Snake, Chomp). */
export function DPad({ onDir }: { onDir: (d: 'up' | 'down' | 'left' | 'right') => void }) {
  return (
    <div className="dpad" role="group" aria-label="Direction pad">
      <PadButton className="dpad__up" label="▲" aria="Up" onDown={() => onDir('up')} />
      <PadButton className="dpad__left" label="◀" aria="Left" onDown={() => onDir('left')} />
      <PadButton className="dpad__right" label="▶" aria="Right" onDown={() => onDir('right')} />
      <PadButton className="dpad__down" label="▼" aria="Down" onDown={() => onDir('down')} />
    </div>
  );
}

/** Arrow keys + WASD → direction. */
export function keyDir(key: string): 'up' | 'down' | 'left' | 'right' | null {
  switch (key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      return 'up';
    case 'ArrowDown':
    case 's':
    case 'S':
      return 'down';
    case 'ArrowLeft':
    case 'a':
    case 'A':
      return 'left';
    case 'ArrowRight':
    case 'd':
    case 'D':
      return 'right';
    default:
      return null;
  }
}
