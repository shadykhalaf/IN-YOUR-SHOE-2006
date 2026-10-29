import { useId, useRef, useState } from 'react';
import { Icon } from '../../components/os/Icon';
import { Window } from '../../components/os/Window';
import { NEWSLETTER_ENDPOINT } from '../../config/integrations';
import { concept, official, officialSources } from '../../data/copy';
import { subscribe } from '../../lib/newsletter';
import type { Win } from '../../state/os';

type Phase = 'idle' | 'joining' | 'error' | 'invalid' | 'offline';

/**
 * IYS NEWSLETTER — the cool list. Separate from IYS MAIL. The 10% code is
 * shown only when the newsletter adapter reports a confirmed signup; with no
 * provider configured it shows an honest "coming online soon" state.
 */
export default function Newsletter({ win }: { win: Win }) {
  const id = useId();
  const [email, setEmail] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const busy = useRef(false);
  const connected = Boolean(NEWSLETTER_ENDPOINT);

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setPhase('joining');
    const r = await subscribe(email);
    busy.current = false;
    if (r.status === 'subscribed') setCode(r.code);
    else setPhase(r.status === 'invalid' ? 'invalid' : r.status === 'not-configured' ? 'offline' : 'error');
  };

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const status = code ? concept.newsletter.successTitle : !connected ? concept.newsletter.offlineTitle : phase === 'joining' ? concept.newsletter.joining : 'Ready.';

  return (
    <Window
      win={win}
      icon="newsletter"
      menubar={['File', 'Edit', 'View', 'Help']}
      statusbar={
        <div className="statusbar">
          <span className="grow" role="status" aria-live="polite">
            {status}
          </span>
        </div>
      }
    >
      <div className="news">
        <div className="news__head">
          <Icon name="newsletter" size={40} />
          <div>
            <p className="news__headline">{concept.newsletter.headline}</p>
            <p className="news__sub">{concept.newsletter.sub}</p>
          </div>
        </div>
        {code ? (
          <div className="news__success" data-testid="newsletter-success">
            <p className="news__headline">{concept.newsletter.successTitle}</p>
            <p>{concept.newsletter.successCode}</p>
            <p className="news__code">{code}</p>
            <button type="button" className="btn btn--go" onClick={copy} data-autofocus>
              {concept.newsletter.copy}
            </button>
            {copied && (
              <p className="small" role="status">
                {concept.newsletter.copied}
              </p>
            )}
          </div>
        ) : (
          <form className="news__form" onSubmit={join} aria-busy={phase === 'joining'}>
            <p className="small">{official.coolList}</p>
            <label htmlFor={`${id}-email`}>Email:</label>
            <div className="news__row">
              <input id={`${id}-email`} className="input" type="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" data-autofocus />
              <button type="submit" className="btn btn--go" disabled={phase === 'joining'}>
                {phase === 'joining' ? concept.newsletter.joining : concept.newsletter.join}
              </button>
            </div>
            {phase === 'invalid' && (
              <p className="mail__error" role="alert">
                {concept.newsletter.invalid}
              </p>
            )}
            {phase === 'offline' && (
              <p className="mail__error" role="alert">
                <span>
                  <b>{concept.newsletter.offlineSubmit}</b>
                  <br />
                  {concept.newsletter.offlineSubmitSub}
                </span>
              </p>
            )}
            {phase === 'error' && (
              <p className="mail__error" role="alert">
                {concept.newsletter.error}
              </p>
            )}
            {!connected && (
              <div className="news__offline" role="note">
                <p>
                  <b>{concept.newsletter.offlineTitle}</b>
                </p>
                <p className="small">{concept.newsletter.offline}</p>
                <a className="btn" href={officialSources.home} target="_blank" rel="noopener noreferrer">
                  Visit inyourshoe.com ↗
                </a>
              </div>
            )}
          </form>
        )}
      </div>
    </Window>
  );
}
