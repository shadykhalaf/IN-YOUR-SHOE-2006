import { useEffect, useRef, useState } from 'react';
import { concept } from '../../data/copy';
import { claimReward, earned, liveRewards, nextReward, playTicket, rewardsOn, type Claim, type PublicReward } from '../../lib/rewards';
import { useCart } from '../../state/cart';
import type { RunResult } from './GameShell';

/**
 * Live rewards for one game + a signed ticket per run. Empty (and no network)
 * unless the deployment has real merchant rewards switched on.
 */
export function useRunRewards(game: string) {
  const [rewards, setRewards] = useState<PublicReward[]>([]);
  const ticket = useRef<string | null>(null);
  const run = useRef(0);
  const [runId, setRunId] = useState(0);
  useEffect(() => {
    if (!rewardsOn()) return;
    let alive = true;
    liveRewards().then((r) => alive && setRewards(r.filter((x) => x.game === game)));
    return () => {
      alive = false;
    };
  }, [game]);
  /** Call on every new run (PLAY, TRY AGAIN, RESTART). */
  const newRun = () => {
    const id = ++run.current;
    setRunId(id);
    ticket.current = null;
    if (!rewards.length) return;
    playTicket(game).then((t) => {
      if (run.current === id) ticket.current = t;
    });
  };
  return { rewards, ticket, runId, newRun };
}
export type RunRewards = ReturnType<typeof useRunRewards>;

/** Before playing: what this game can really unlock right now. */
export function RewardTeaser({ r }: { r: RunRewards }) {
  const first = [...r.rewards].sort((a, b) => a.minScore - b.minScore)[0];
  if (!first) return null;
  return <p className="game__reward-hint">{concept.rewards.ready(first.label, first.minScore)}</p>;
}

type State = { k: 'idle' } | { k: 'claiming' } | { k: 'got'; claim: Extract<Claim, { ok: true }> } | { k: 'error'; error: string };

/** After a run: claim an earned reward (explicit tap, never automatic), then copy it or save it in MY BAG. */
export function RewardResult({ r, game, result }: { r: RunRewards; game: string; result: RunResult }) {
  const [state, setState] = useState<State>({ k: 'idle' });
  const [copied, setCopied] = useState(false);
  const [used, setUsed] = useState(false);
  const win = earned(r.rewards, game, result.score, result.won);
  const next = win ? null : nextReward(r.rewards, game, result.score);
  if (!r.rewards.length) return null;
  if (!win) return next ? <p className="game__reward-hint">{concept.rewards.next(next.label, next.minScore)}</p> : null;

  const claim = async () => {
    if (state.k === 'claiming' || !r.ticket.current) return setState({ k: 'error', error: 'This game session can’t claim a reward. Play again to claim.' });
    setState({ k: 'claiming' });
    const c = await claimReward(win.id, r.ticket.current, result.score, result.won);
    setState(c.ok ? { k: 'got', claim: c } : { k: 'error', error: c.error });
  };
  const copy = async () => {
    if (state.k !== 'got') return;
    try {
      await navigator.clipboard.writeText(state.claim.code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="game__reward" data-testid="game-reward" role="status" aria-live="polite">
      <p className="game__reward-title">{concept.rewards.earned}</p>
      <p className="game__reward-label">
        <b>{win.label}</b> · {win.description}
      </p>
      {state.k === 'got' ? (
        <>
          <p className="game__reward-code">
            <code>{state.claim.code}</code>
          </p>
          <div className="game__reward-actions">
            <button type="button" className="btn btn--small" onClick={copy}>
              {copied ? concept.rewards.copied : concept.rewards.copy}
            </button>
            <button
              type="button"
              className="btn btn--small btn--go"
              onClick={() => {
                useCart.getState().setDiscountCode(state.claim.code);
                setUsed(true);
              }}
            >
              {used ? concept.rewards.used : concept.rewards.use}
            </button>
          </div>
          <small>
            {state.claim.conditions ? `${state.claim.conditions} ` : ''}
            {concept.rewards.note}
          </small>
        </>
      ) : (
        <>
          <button type="button" className="btn btn--small btn--go" onClick={claim} disabled={state.k === 'claiming'}>
            {state.k === 'claiming' ? concept.rewards.claiming : concept.rewards.claim}
          </button>
          {state.k === 'error' && <small className="game__reward-error">{state.error}</small>}
        </>
      )}
    </div>
  );
}
