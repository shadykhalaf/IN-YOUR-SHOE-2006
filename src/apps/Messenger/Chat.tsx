import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../../components/os/Icon';
import { Price } from '../../components/shop/Price';
import { RemoteImage } from '../../components/shop/RemoteImage';
import { assets, brand } from '../../data/assets';
import { concept } from '../../data/copy';
import { BUDDIES } from '../../data/taxonomy';
import { setWallpaperImage, openViewer } from '../../lib/actions';
import { useCatalogue } from '../../lib/catalogue/load';
import { chatScript, type ChatEvent } from '../../lib/chatScript';
import { prefersReducedMotion } from '../../lib/motion';
import { play } from '../../lib/sound';
import { collectionPath, productPath, useBrowse } from '../../lib/useBrowse';
import { useFavorites } from '../../state/favorites';
import type { Product } from '../../lib/catalogue/types';
import { showBuddies } from './nav';

function FileCard({ ev, from, onOpen }: { ev: Extract<ChatEvent, { t: 'file' }>; from: string; onOpen: () => void }) {
  const [pct, setPct] = useState(prefersReducedMotion() ? 100 : 0);
  const fav = useFavorites((s) => s.handles.includes(ev.product.handle));
  const toggle = useFavorites((s) => s.toggle);
  useEffect(() => {
    if (pct >= 100) return;
    const t = window.setTimeout(() => setPct((p) => Math.min(100, p + 34)), 90);
    return () => window.clearTimeout(t);
  }, [pct]);
  const done = pct >= 100;
  return (
    <div className="xfer">
      <p className="xfer__head">
        <Icon name="image" size={16} /> {from} sent <b>{ev.filename}</b>
      </p>
      {!done ? (
        <div className="progress" style={{ ['--p' as string]: `${pct}%` }}>
          <div className="progress__bar" />
        </div>
      ) : (
        <div className="xfer__body">
          <button type="button" className="xfer__img" onClick={onOpen} aria-label={`Open ${ev.product.title}`}>
            {ev.local ? <img src={ev.image} alt="" loading="lazy" /> : <RemoteImage src={ev.image} alt="" title={ev.product.title} base={240} sizes="120px" />}
          </button>
          <div className="xfer__meta">
            <b>{ev.product.title}</b>
            <Price price={ev.product.price} compareAt={ev.product.compareAtPrice} />
            <span className="xfer__done">Transfer complete.</span>
            <span className="xfer__actions">
              <button type="button" className="btn btn--small btn--primary" onClick={onOpen}>
                Open
              </button>
              <button type="button" className="btn btn--small" aria-pressed={fav} onClick={() => toggle(ev.product.handle)} aria-label={fav ? `Remove ${ev.product.title} from Favorites` : `Add ${ev.product.title} to Favorites`}>
                {fav ? '★' : '☆'}
              </button>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/** What the Messenger window shows around a conversation: its status line and the latest shared product (for Actions). */
export interface ChatInfo {
  status: string;
  shared: Product | null;
}

/** The conversation view of the IYS MESSENGER window. */
export function Chat({ buddyId, onInfo }: { buddyId: string; onInfo: (info: ChatInfo) => void }) {
  const buddy = BUDDIES.find((b) => b.id === buddyId) ?? BUDDIES[0]!;
  const cat = useCatalogue();
  const browse = useBrowse();
  const script = useMemo(() => (cat ? chatScript(buddyId, cat) : []), [cat, buddyId]);
  const [shown, setShown] = useState(0);
  const [typing, setTyping] = useState(false);
  const [mine, setMine] = useState<{ text: string; auto?: boolean }[]>([]);
  const [draft, setDraft] = useState('');
  const log = useRef<HTMLDivElement>(null);
  const cam = assets.camera.filter((c) => c.folder === (buddyId === 'cairo' ? 'CAIRO' : 'PJOYS'));
  const [frame, setFrame] = useState(0);

  // Play the scripted conversation once; everything at once for reduced motion.
  useEffect(() => {
    if (!script.length) return;
    if (prefersReducedMotion()) {
      setShown(script.length);
      return;
    }
    if (shown >= script.length) {
      setTyping(false);
      return;
    }
    const ev = script[shown]!;
    setTyping(ev.t === 'msg' && ev.delay > 600);
    const t = window.setTimeout(() => {
      setTyping(false);
      setShown((n) => n + 1);
      if (shown === 1) play('ping');
    }, ev.delay);
    return () => window.clearTimeout(t);
  }, [script, shown]);

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [shown, mine.length, typing]);

  // "Display picture" cycles real lifestyle frames (camera-style), paused for reduced motion.
  useEffect(() => {
    if (prefersReducedMotion() || cam.length < 2) return;
    const t = window.setInterval(() => setFrame((f) => (f + 1) % cam.length), 2600);
    return () => window.clearInterval(t);
  }, [cam.length]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    setMine((m) => [...m, { text }, ...(m.some((x) => x.auto) ? [] : [{ text: concept.messenger.autoReply(buddy.name), auto: true }])]);
  };

  const events = script.slice(0, shown);
  const lastFile = [...events].reverse().find((ev): ev is Extract<ChatEvent, { t: 'file' }> => ev.t === 'file');
  const shared = lastFile?.product ?? null;
  const status = typing ? `${buddy.name} is typing a message...` : shown >= script.length ? 'Last message received.' : 'Receiving...';
  useEffect(() => onInfo({ status, shared }), [onInfo, status, shared]);
  const dp = cam[frame];
  return (
    <div className="chat">
      <div className="chat__to">
        To: <b>{buddy.name}</b> &lt;{buddy.collection}@iys&gt; <span className={`orb orb--${buddy.status}`} aria-hidden="true" /> {buddy.status}
        <button type="button" className="btn btn--small chat__back" onClick={showBuddies} title="Back to the buddy list">
          <span aria-hidden="true">&lt; </span>back 2 buddies
        </button>
        <span className="chat__mood">{buddyId === 'pjoys' ? '2:13 AM · ' : ''}{buddy.mood}</span>
      </div>
      <div className="chat__main">
        <div className="chat__log" ref={log} role="log" aria-live="polite" aria-label={`Conversation with ${buddy.name}`}>
          {events.map((ev, i) => {
            if (ev.t === 'system')
              return (
                <p key={i} className="chat__sys">
                  <Icon name="info" size={16} /> {ev.text}
                </p>
              );
            if (ev.t === 'msg')
              return (
                <div key={i} className="chat__msg">
                  <p className="chat__who">{buddy.name} says:</p>
                  <p className="chat__text" lang={ev.lang}>
                    {ev.text}
                    {ev.note && <small className="chat__note"> ({ev.note})</small>}
                  </p>
                </div>
              );
            if (ev.t === 'file') return <FileCard key={i} ev={ev} from={buddy.name} onOpen={() => browse(productPath(ev.product.handle))} />;
            return (
              <div key={i} className="xfer">
                <p className="xfer__head">
                  <Icon name="folder" size={16} /> {buddy.name} sent <b>pjoy_patterns.zip</b> ({ev.tiles.length} files)
                </p>
                <ul className="tiles">
                  {ev.tiles.map((tile) => (
                    <li key={tile.src}>
                      <button type="button" className="tiles__img" style={{ backgroundImage: `url("${tile.src}")` }} onClick={() => openViewer([{ src: tile.src, title: tile.title, alt: `${tile.title} pattern detail`, filename: `${tile.handle}.jpg`, sourceUrl: tile.sourceUrl, productHandle: tile.handle }])} aria-label={`View ${tile.title} pattern`} />
                      <button type="button" className="btn btn--small" aria-label={`Set ${tile.title} pattern as wallpaper`} onClick={() => setWallpaperImage({ src: tile.src, title: `${tile.title} (pattern)`, sourceUrl: tile.sourceUrl }, 'tile')}>
                        Wallpaper
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          {typing && <p className="chat__typing">{buddy.name} is typing...</p>}
          {mine.map((m, i) =>
            m.auto ? (
              <p key={`m${i}`} className="chat__sys">
                {m.text}{' '}
                <button type="button" className="link" onClick={() => browse(collectionPath(buddy.collection))}>
                  open {buddy.name}
                </button>
              </p>
            ) : (
              <div key={`m${i}`} className="chat__msg chat__msg--me">
                <p className="chat__who">you say:</p>
                <p className="chat__text">{m.text}</p>
              </div>
            ),
          )}
        </div>
        <aside className="chat__cams" aria-label="Display pictures">
          <figure className="dpframe">
            {dp ? <img key={dp.src} src={dp.src} alt={`${dp.title} - IYS product photo`} /> : <img src={brand.mark} alt="" />}
            <figcaption>{buddy.name}</figcaption>
          </figure>
          <figure className="dpframe dpframe--me">
            <img src={brand.markWhite} alt="" />
            <figcaption>you</figcaption>
          </figure>
        </aside>
      </div>
      <form className="chat__compose" onSubmit={send}>
        <label htmlFor={`compose-chat-${buddyId}`} className="sr-only">
          Message to {buddy.name}
        </label>
        <textarea id={`compose-chat-${buddyId}`} className="input" rows={2} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send(e);
          }
        }} />
        <button type="submit" className="btn">
          Send
        </button>
      </form>
    </div>
  );
}
