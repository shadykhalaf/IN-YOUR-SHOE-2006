import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Icon, type IconName } from '../components/os/Icon';
import { Price } from '../components/shop/Price';
import { concept, official } from '../data/copy';
import { formatCount } from '../lib/catalogue/format';
import { SC, SC_IMAGES } from './data';
import { buildTimeline, DURATION } from './timeline';
import '../styles/os.css';
import '../styles/apps.css';
import './showcase.css';

declare global {
  interface Window {
    __iysShowcase?: {
      play: () => void;
      pause: () => void;
      seek: (t: number) => void;
      restart: () => void;
      time: () => number;
      duration: number;
      ready: boolean;
    };
  }
}

/** Static frame of the site's real window chrome (same classes as components/os/Window). */
function SWin({ id, title, icon, style, children, status, chrome }: { id: string; title: string; icon: IconName; style: CSSProperties; children: ReactNode; status?: string; chrome?: string }) {
  return (
    <div className="win is-active sc-win" data-sc={id} style={style}>
      <div className="titlebar">
        <Icon name={icon} size={16} className="titlebar__icon" />
        <p className="titlebar__title">{title}</p>
        <div className="titlebar__buttons">
          <span className="tbtn">
            <svg viewBox="0 0 10 10" shapeRendering="crispEdges">
              <rect x="1" y="7" width="6" height="2" fill="#fff" />
            </svg>
          </span>
          <span className="tbtn">
            <svg viewBox="0 0 10 10" shapeRendering="crispEdges">
              <path d="M0 0h10v10H0zm1 3v6h8V3z" fill="#fff" fillRule="evenodd" />
            </svg>
          </span>
          <span className="tbtn tbtn--close">
            <svg viewBox="0 0 10 10" shapeRendering="crispEdges">
              <path d="M0 0h2v1h1v1h1v1h2V2h1V1h1V0h2v2H9v1H8v1H7v2h1v1h1v1h1v2H8V9H7V8H6V7H4v1H3v1H2v1H0V8h1V7h1V6h1V4H2V3H1V2H0z" fill="#fff" />
            </svg>
          </span>
        </div>
      </div>
      {chrome && (
        <div className="sc-addr">
          <span>Address</span>
          <span className="input">{chrome}</span>
        </div>
      )}
      <div className="win__body">{children}</div>
      {status && (
        <div className="statusbar">
          <span className="grow">{status}</span>
        </div>
      )}
    </div>
  );
}

function Cam({ src, n }: { src: string; n: number }) {
  return (
    <div className="contact__frame sc-cam" data-sc="cam">
      <span className="contact__photo">
        <img src={src} alt="" />
        <span className="contact__stamp">TM▸2006</span>
      </span>
      <span className="contact__name">IMG_{String(n + 17).padStart(4, '0')}.JPG</span>
    </div>
  );
}

const ICONS: [IconName, string][] = [
  ['internet', 'IYS INTERNET'],
  ['hanger', 'SHOP ALL'],
  ['pjoys', 'PJOYS'],
  ['wardrobe', 'MY WARDROBE'],
  ['messenger', 'IYS MESSENGER'],
  ['camera', 'IYS CAMERA'],
  ['bag', 'MY BAG'],
];

export default function Showcase() {
  const stage = useRef<HTMLDivElement>(null);
  const params = new URLSearchParams(window.location.search);
  const record = params.has('record');
  const [scale, setScale] = useState(1);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);

  useLayoutEffect(() => {
    if (record) return;
    const fit = () => setScale(Math.max(0.2, Math.min(window.innerWidth / 540, (window.innerHeight - 56) / 960)));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [record]);

  useEffect(() => {
    document.title = 'IYS INTERNET 2006 - showcase (unofficial concept by Omar Akram)';
    const tl = buildTimeline(stage.current!);
    const api = {
      play: () => {
        if (tl.time() >= DURATION) tl.seek(0);
        tl.play();
        setPlaying(true);
      },
      pause: () => {
        tl.pause();
        setPlaying(false);
      },
      seek: (s: number) => {
        tl.pause();
        tl.seek(Math.max(0, Math.min(DURATION, s)), false);
        setPlaying(false);
        if (!record) setT(tl.time());
      },
      restart: () => {
        tl.restart();
        setPlaying(true);
      },
      time: () => tl.time(),
      duration: DURATION,
      ready: false,
    };
    window.__iysShowcase = api;
    if (!record) tl.eventCallback('onUpdate', () => setT(tl.time()));
    tl.eventCallback('onComplete', () => setPlaying(false));
    let alive = true;
    const decode = (src: string) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.src = src;
        img.decode().then(resolve, resolve);
      });
    Promise.all([...new Set(SC_IMAGES)].map(decode))
      .then(() => document.fonts?.ready)
      .then(() => {
        if (!alive) return;
        const start = params.get('t');
        if (start !== null) api.seek(Number(start) || 0);
        else if (record) api.seek(0);
        else api.play();
        api.ready = true;
      });
    return () => {
      alive = false;
      tl.kill();
      delete window.__iysShowcase;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`sc-root${record ? ' sc-root--record' : ''}`}>
      <div className="sc-frame" style={record ? undefined : { transform: `scale(${scale})` }}>
        <div className="sc-stage showcase" ref={stage} role="img" aria-label="IYS INTERNET 2006 showcase film - unofficial In Your Shoe concept by Omar Akram">
          {/* ── Desktop ─────────────────────────────────────────── */}
          <div className="sc-desk">
            <div className="sc-wall" data-sc="wall1" style={{ backgroundImage: `url("${SC.wallpaper}")` }} />
            <div className="sc-wall" data-sc="wall2" style={{ backgroundImage: `url("${SC.wallpaper2}")` }} />
            <ul className="sc-icons">
              {ICONS.map(([ic, label]) => (
                <li key={label} className="dicon sc-icon" data-sc="icon">
                  <span className="dicon__img">
                    <Icon name={ic} size={40} />
                  </span>
                  {label === 'MY BAG' && (
                    <span className="dicon__badge" data-sc="bagbadge">
                      1
                    </span>
                  )}
                  <span className="dicon__label">{label}</span>
                </li>
              ))}
            </ul>
            <div className="sc-stamp" data-sc="stamp">
              <b>{concept.name}</b>
              <br />
              {formatCount(SC.total)} real IYS products
              <br />
              unofficial concept
            </div>

            <SWin id="portal" title="IN YOUR SHOE | The Coolest Apparel In Town! - IYS INTERNET" icon="internet" chrome="http://www.inyourshoe.com/" style={{ left: 12, top: 30, width: 516, height: 640 }} status={`${formatCount(SC.total)} products found.`}>
              <div className="sc-portal">
                <div className="sc-portal__head">
                  <img src={SC.brand.wordmark} alt="" />
                  <p>{official.coolDecision}</p>
                </div>
                <div className="marquee sc-marquee">NEW STUFF ★ PJOYS ★ HOODIES ★ SOCKS ★ CAIRO ★ IYS × ZED ★</div>
                <p className="box__title box__title--coral">TOP 8 COOL DECISIONS</p>
                <ol className="sc-top8">
                  {SC.top8.map((p, i) => (
                    <li key={p.handle} data-sc="top8">
                      <span className="top8__n">{i + 1}</span>
                      <img src={p.src} alt="" />
                      <b>{p.title}</b>
                      <Price price={p.price} compareAt={p.compareAtPrice} />
                    </li>
                  ))}
                </ol>
              </div>
            </SWin>

            <SWin id="chat" title="PJOYS - Conversation" icon="messenger" style={{ left: 30, top: 236, width: 490, height: 640 }} status="PJOYS is sending files...">
              <div className="chat sc-chat">
                <div className="chat__to">
                  To: <b>PJOYS</b> <span className="orb orb--online" /> online
                  <span className="chat__mood">2:13 AM · sleepover mode</span>
                </div>
                <div className="sc-chat__log">
                  <p className="chat__who" data-sc="msg">
                    PJOYS says:
                  </p>
                  <p className="chat__text sc-big" data-sc="msg">
                    u awake?
                  </p>
                  <p className="chat__text" data-sc="msg" lang="ar-Latn">
                    {concept.messenger.pjoysFranco} <small className="chat__note">(Franco-Arabic: “are you awake?”)</small>
                  </p>
                  <p className="chat__text" data-sc="msg">
                    omg found these 4 the sleepover xd
                  </p>
                  <ul className="sc-atts">
                    {SC.pjoys.map((p) => (
                      <li key={p.handle} data-sc="att">
                        <img src={p.src} alt="" />
                        <b>{p.title}</b>
                        <Price price={p.price} compareAt={p.compareAtPrice} />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </SWin>

            <SWin id="shop" title="Shop All - IYS INTERNET" icon="internet" chrome="http://www.inyourshoe.com/shop" style={{ left: 8, top: 16, width: 524, height: 850 }} status={`48 of ${formatCount(SC.total)} products.`}>
              <div className="sc-shop">
                <p className="page__title">SHOP ALL</p>
                <p className="page__meta">
                  <b>{formatCount(SC.total)}</b> real products · page{' '}
                  <span className="sc-odo">
                    <span className="sc-odo__col" data-sc="odo">
                      {Array.from({ length: SC.pages }, (_, i) => (
                        <span key={i}>{i + 1}</span>
                      ))}
                    </span>
                  </span>{' '}
                  of {SC.pages}
                </p>
                <div className="sc-shop__view">
                  <ul className="sc-shop__grid" data-sc="shopgrid">
                    {SC.thumbs.map((p) => (
                      <li key={p.handle}>
                        <img src={p.src} alt="" />
                        <span>{p.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="sc-search" data-sc="search">
                  <p className="search__title">
                    <Icon name="search" size={32} /> SEARCH THE IYS INTERNET
                  </p>
                  <div className="sc-search__row">
                    <span className="input sc-search__input">
                      <span className="sc-type" data-sc="q">
                        CAIRO
                      </span>
                    </span>
                    <span className="btn btn--primary">Search</span>
                  </div>
                  <p className="results__meta">
                    Results 1 - {SC.cairo.length} for <b>cairo</b>
                  </p>
                  <ol className="sc-results">
                    {SC.cairo.map((p) => (
                      <li key={p.handle} className="result" data-sc="res">
                        <img src={p.src} alt="" />
                        <div>
                          <p className="result__title">
                            <u>{p.title}</u>
                          </p>
                          <p className="result__url">www.inyourshoe.com/products/{p.handle}</p>
                          <Price price={p.price} compareAt={p.compareAtPrice} />
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </SWin>

            <SWin id="product" title={`${SC.hero.title} - IYS INTERNET`} icon="internet" chrome={`http://www.inyourshoe.com/products/${SC.hero.handle}`} style={{ left: 10, top: 40, width: 520, height: 790 }} status="Done.">
              <div className="sc-product">
                <div className="sc-product__img">
                  <img src={SC.hero.src} alt="" />
                  <span className="gallery__file">IMG_0001.JPG</span>
                </div>
                <div className="sc-product__props">
                  <p className="props__title">{SC.hero.title}</p>
                  <Price price={SC.hero.price} compareAt={SC.hero.compareAtPrice} large />
                  <span className="stock stock--in">IN STOCK</span>
                  <div className="variants__values sc-chips">
                    {['S', 'M', 'L', 'XL'].map((s) => (
                      <span key={s} className="chip">
                        <label data-sc={s === 'M' ? 'chipM' : undefined}>{s}</label>
                      </span>
                    ))}
                  </div>
                  <span className="btn btn--go sc-add" data-sc="add">
                    ADD TO BAG
                  </span>
                  <u className="props__real">VIEW CURRENT ITEM ON IYS ↗</u>
                </div>
              </div>
            </SWin>

            <SWin id="camera" title="IYS CAMERA" icon="camera" chrome="E:\DCIM\" style={{ left: 14, top: 40, width: 512, height: 710 }} status="Official IYS photos">
              <div className="sc-contact">
                {[SC.camera[0]!, SC.camera[6]!, SC.camera[2]!, SC.camera[7]!, SC.store.src, SC.camera[4]!].map((src, n) => (
                  <Cam key={src} src={src} n={n} />
                ))}
              </div>
            </SWin>
            <SWin id="viewer" title="IMG_0017.JPG - IYS IMAGE VIEWER" icon="image" style={{ left: 24, top: 110, width: 492, height: 690 }} status={SC.pjoys[0]!.title}>
              <div className="sc-viewer">
                <div className="viewer__bar">
                  <span className="btn btn--tool">◀</span>
                  <span className="btn btn--tool">▶</span>
                  <span className="btn btn--tool">100%</span>
                  <span className="btn btn--tool sc-setwp" data-sc="setwp">
                    <Icon name="wallpaper" size={16} /> Set as wallpaper
                  </span>
                </div>
                <div className="sc-viewer__stage">
                  <img src={SC.wallpaper2} alt="" />
                </div>
              </div>
            </SWin>

            <SWin id="wardrobe" title="MY WARDROBE" icon="wardrobe" chrome="C:\IYS\WARDROBE\" style={{ left: 12, top: 90, width: 516, height: 660 }} status="Counts from the catalogue snapshot">
              <div className="sc-wardrobe">
                <ul className="sc-folders">
                  {SC.folders.map((f) => (
                    <li key={f.label} data-sc="fold" className={f.label === 'PJOYS' ? 'is-target' : undefined}>
                      <Icon name={f.label === 'PJOYS' ? 'pjoys' : 'folder'} size={48} />
                      <b>{f.label}</b>
                      <small>{formatCount(f.n)} items</small>
                    </li>
                  ))}
                </ul>
                <ul className="sc-wthumbs" data-sc="wthumbs">
                  {SC.pjoys.map((p) => (
                    <li key={p.handle}>
                      <img src={p.src} alt="" />
                      <span>{p.title.replace(/[^A-Za-z0-9]+/g, '_')}.jpg</span>
                    </li>
                  ))}
                </ul>
              </div>
            </SWin>

            <SWin id="bag" title="MY BAG" icon="bag" style={{ left: 240, top: 430, width: 280, height: 250 }} status="1 item(s)">
              <div className="sc-bag">
                <img src={SC.hero.src} alt="" />
                <div>
                  <b>{SC.hero.title}</b>
                  <small>Size M</small>
                  <Price price={SC.hero.price} compareAt={SC.hero.compareAtPrice} />
                </div>
              </div>
            </SWin>
            <SWin id="store" title="IN YOUR SHOE - CITY STARS.JPG" icon="image" style={{ left: 16, top: 560, width: 330, height: 250 }}>
              <img className="sc-fill" src={SC.store.src} alt="" />
            </SWin>
            <SWin id="tile" title="pjoy_patterns.zip" icon="folder" style={{ left: 300, top: 160, width: 220, height: 210 }}>
              <div className="sc-tile" style={{ backgroundImage: `url("${SC.tiles[0]}")` }} />
            </SWin>

            <div className="sc-exe" data-sc="exe">
              <Icon name="exe" size={48} />
              <span>IYS.EXE</span>
            </div>

            <div className="dialog sc-dialog" data-sc="dialog">
              <div className="titlebar">
                <Icon name="exe" size={16} className="titlebar__icon" />
                <p className="titlebar__title">IYS.EXE</p>
              </div>
              <div className="dialog__body">
                <Icon name="info" size={32} />
                <p className="dialog__big">{official.coolDecision}</p>
              </div>
              <div className="dialog__actions">
                <span className="btn">Cancel</span>
                <span className="btn btn--primary" data-sc="obv">
                  Obviously
                </span>
              </div>
            </div>

            <div className="balloon sc-balloon" data-sc="balloon">
              <img className="balloon__photo" src={SC.pjoys[0]!.src} alt="" />
              <div>
                <strong>PJOYS is online</strong>
                <p>“u awake?”</p>
              </div>
            </div>

            <div className="transfer sc-xfer" data-sc="xfer">
              <div className="titlebar">
                <Icon name="bag" size={16} className="titlebar__icon" />
                <p className="titlebar__title">Copying...</p>
              </div>
              <div className="transfer__body">
                <p>
                  {concept.copying} <b>MY BAG</b>
                </p>
                <p className="transfer__name">{SC.hero.title} - M</p>
                <div className="progress">
                  <div className="progress__bar" data-sc="xferbar" />
                </div>
                <p className="transfer__pct" data-sc="xferdone">
                  100% - {concept.itemAdded}
                </p>
              </div>
            </div>
          </div>

          {/* ── Taskbar ─────────────────────────────────────────── */}
          <div className="taskbar sc-taskbar" data-sc="taskbar">
            <span className="start">
              <img src={SC.brand.markWhite} alt="" />
              <span>menu</span>
            </span>
            <div className="tasks">
              {['IYS INTERNET', 'PJOYS', 'IYS CAMERA', 'MY WARDROBE'].map((l) => (
                <span key={l} className="task" data-sc="task">
                  <span>{l}</span>
                </span>
              ))}
            </div>
            <div className="tray">
              <span className="tray__notice" data-sc="notice">
                {concept.wallpaperUpdated}
              </span>
              <span className="clock">2:13 AM</span>
            </div>
          </div>

          <svg className="sc-cursor" data-sc="cursor" width="20" height="22" viewBox="0 0 20 22" shapeRendering="crispEdges">
            <path d="M1 1v16l4-4 3 6 3-1-3-6h6z" fill="#fff" stroke="#000" strokeWidth="1.2" />
          </svg>
          <div className="sc-flash" data-sc="flash" />

          {/* ── End card ────────────────────────────────────────── */}
          <div className="sc-end" data-sc="end">
            <img src={SC.brand.wordmarkWhite} alt="" className="sc-end__logo" />
            <p className="sc-end__line">
              YOU’RE ABOUT TO
              <br />
              MAKE A COOL DECISION.
            </p>
            <p className="sc-end__small">2000s INTERNET CONCEPT</p>
            <p className="sc-end__name">OMAR AKRAM · 2026</p>
            <p className="sc-end__disc">
              UNOFFICIAL SPECULATIVE CONCEPT
              <br />
              NOT AFFILIATED WITH IN YOUR SHOE
            </p>
          </div>

          {/* ── Boot ────────────────────────────────────────────── */}
          <div className="sc-boot" data-sc="boot">
            <div className="sc-dot" data-sc="dot" />
            <div className="sc-boot__screen" data-sc="bootscreen">
              <p className="boot__machine">{concept.boot.machine}</p>
              <p className="boot__sub">IYS OS · target 2006</p>
              <ul className="boot__lines">
                {concept.boot.lines.map(([k, v]) => (
                  <li key={k} data-sc="bootline">
                    <span>{k}</span>
                    <span className="boot__dots" />
                    <b>{v}</b>
                  </li>
                ))}
              </ul>
              <div data-sc="boottarget">
                <img src={SC.brand.wordmarkWhite} alt="" className="boot__logo" />
                <p>{concept.boot.target}</p>
                <p className="boot__connecting">{concept.boot.connecting}</p>
                <div className="progress boot__bar">
                  <div className="progress__bar" data-sc="bootbar" />
                </div>
              </div>
            </div>
          </div>
          <div className="crt sc-crt" aria-hidden="true" />
          <div className="sc-power" data-sc="power" aria-hidden="true">
            <div className="sc-power__line" data-sc="powerline" />
          </div>
        </div>
      </div>
      {!record && (
        <div className="sc-controls">
          <button type="button" onClick={() => (playing ? window.__iysShowcase?.pause() : window.__iysShowcase?.play())}>
            {playing ? 'Pause' : 'Play'}
          </button>
          <button type="button" onClick={() => window.__iysShowcase?.restart()}>
            Restart
          </button>
          <input type="range" min={0} max={DURATION} step={0.01} value={t} aria-label="Seek" onChange={(e) => window.__iysShowcase?.seek(Number(e.target.value))} />
          <span>
            {t.toFixed(2)} / {DURATION.toFixed(1)}s
          </span>
          <span className="sc-controls__note">Unofficial concept by Omar Akram - not affiliated with In Your Shoe</span>
        </div>
      )}
    </div>
  );
}
