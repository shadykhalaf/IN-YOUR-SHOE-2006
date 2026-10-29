import { useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Icon } from '../../../components/os/Icon';
import { PageLoading } from '../../../components/shop/PageLoading';
import { Price, SaleBadge } from '../../../components/shop/Price';
import { RemoteImage } from '../../../components/shop/RemoteImage';
import { EssentialLinks } from '../../../components/shop/EssentialLinks';
import { assets, brand, campaign, curation, localImage, pick } from '../../../data/assets';
import { ANNOUNCEMENT_VERIFIED_ON, concept, official, OFFICIAL_VERIFIED_ON } from '../../../data/copy';
import { BUDDIES, MENU } from '../../../data/taxonomy';
import storesData from '../../../data/stores.generated.json';
import { collectionProducts } from '../../../lib/catalogue/hydrate';
import { formatCount } from '../../../lib/catalogue/format';
import { useCatalogue } from '../../../lib/catalogue/load';
import type { Product } from '../../../lib/catalogue/types';
import { usePage } from '../../../lib/usePage';
import { buildShelves, HOME_SHELVES, type Shelf } from '../../../lib/merch';
import { FEATURES } from '../../../config/features';
import { collectionPath, productPath } from '../../../lib/useBrowse';
import { useOS } from '../../../state/os';
import { openChat } from '../../Messenger/nav';

function Img({ p, local = true, size = 240 }: { p: Product; local?: boolean; size?: number }) {
  const li = local ? localImage(p.handle) : null;
  return li ? (
    <img src={li.src} alt="" width={li.width} height={li.height} loading="lazy" decoding="async" />
  ) : (
    <RemoteImage src={p.image} alt="" title={p.title} width={p.imageWidth} height={p.imageHeight} base={size} sizes={`${Math.round(size * 0.6)}px`} />
  );
}

/** A home shelf: one of IYS's own collections, same look as JUST DROPPED. */
function ShelfBox({ shelf }: { shelf: Shelf }) {
  return (
    <section className="box box--shelf" aria-labelledby={`shelf-${shelf.handle}`}>
      <h2 className="box__title" id={`shelf-${shelf.handle}`}>
        {shelf.title.toUpperCase()} <small>{shelf.note}</small>
      </h2>
      <ul className="strip">
        {shelf.products.map((p) => (
          <li key={p.handle}>
            <Link to={productPath(p.handle)}>
              <span className="strip__media">
                <Img p={p} local={false} size={240} />
                {p.onSale && <SaleBadge />}
              </span>
              <span>{p.title}</span>
            </Link>
            <Price price={p.price} compareAt={p.compareAtPrice} />
          </li>
        ))}
      </ul>
      <p className="box__more">
        <Link to={collectionPath(shelf.handle)}>
          see all {formatCount(shelf.count)} in {shelf.title.toUpperCase()} ›
        </Link>
      </p>
    </section>
  );
}

export function WebBadge({ label, sub, tone = 'blue' }: { label: string; sub?: string; tone?: 'blue' | 'coral' | 'green' | 'ink' }) {
  return (
    <span className={`badge88 badge88--${tone}`}>
      <b>{label}</b>
      {sub && <small>{sub}</small>}
    </span>
  );
}

/**
 * "Show a little of what comes next": in the page's first screen the FW27
 * hero gives up just enough height for JUST DROPPED's title and the top row
 * of its photos to show below it. Layout only: nothing scrolls, nothing is
 * hidden, and the hero keeps its natural size whenever the window has room.
 */
const PEEK = 112;
const HERO_MIN = 140;
const SHORT_BELOW = 640;
function useFoldPeek(ready: boolean) {
  const portal = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLElement>(null);
  const [short, setShort] = useState(false);
  useLayoutEffect(() => {
    const root = portal.current;
    const fig = hero.current;
    const page = root?.closest<HTMLElement>('.win__scroll');
    if (!root || !fig || !page) return;
    const fit = () => {
      setShort(page.clientHeight < SHORT_BELOW);
      const top = fig.getBoundingClientRect().top - page.getBoundingClientRect().top + page.scrollTop;
      const caption = fig.querySelector('figcaption')?.getBoundingClientRect().height ?? 0;
      const natural = (fig.clientWidth * 806) / 1920;
      const room = page.clientHeight - top - caption - 12 - PEEK;
      fig.style.setProperty('--hero-h', `${Math.round(Math.max(HERO_MIN, Math.min(natural, room)))}px`);
    };
    const ro = new ResizeObserver(fit);
    ro.observe(page);
    root.querySelectorAll('.portal__head, .portal__cta').forEach((el) => ro.observe(el));
    fit();
    return () => ro.disconnect();
  }, [ready]);
  return { portal, hero, short };
}

export default function Home() {
  const cat = useCatalogue();
  const navigate = useNavigate();
  const fold = useFoldPeek(Boolean(cat));
  usePage('IN YOUR SHOE | The Coolest Apparel In Town!', cat ? `${formatCount(cat.products.length)} products found.` : 'Opening page...');
  if (!cat) return <PageLoading label="Connecting to www.inyourshoe.com..." />;

  const top8 = pick(cat, curation.top8);
  const newest = collectionProducts(cat, 'newest').slice(0, 6);
  const pjoys = collectionProducts(cat, 'pjoys');
  const cairo = pick(cat, curation.cairo).slice(0, 4);
  const shelves = FEATURES.homeShelves
    ? buildShelves(cat, HOME_SHELVES, { exclude: [...newest, ...top8, ...pjoys.slice(0, 6), ...cairo].map((p) => p.handle), per: 6 })
    : [];
  const shelf = (i: number) => (shelves[i] ? <ShelfBox key={shelves[i].handle} shelf={shelves[i]} /> : null);
  const fw = campaign('fw27-2');
  const zed = campaign('zed-1');

  return (
    <div ref={fold.portal} className={`page portal${fold.short ? ' portal--short' : ''}`}>
      <header className="portal__head">
        <img className="portal__logo" src={brand.wordmark} alt="In Your Shoe" width={346} height={114} />
        <div className="portal__tag">
          <p className="portal__official" title={`Official IYS line, verified on inyourshoe.com ${OFFICIAL_VERIFIED_ON}`}>
            {official.coolDecision}
          </p>
          <p className="portal__sub">{official.coolestApparel}</p>
        </div>
      </header>
      <div className="portal__announce" title={`Announcement bar on inyourshoe.com, ${ANNOUNCEMENT_VERIFIED_ON}. Offers change - check the real site.`}>
        <span>{official.sameDay}</span>
        <span>{official.freeShipping}</span>
        <span className="portal__announce-note">as announced on inyourshoe.com · {ANNOUNCEMENT_VERIFIED_ON}</span>
      </div>
      <div className="marquee">
        <p className="sr-only">New stuff, Pjoys, Fluffy Pjoys, hoodies, socks, Cairo, IYS × ZED, women, kids.</p>
        <div className="marquee__track" aria-hidden="true">
          {[0, 1].map((k) => (
            <span key={k}>NEW STUFF ★ PJOYS ★ FLUFFY PJOYS ★ HOODIES ★ SOCKS ★ CAIRO ★ IYS × ZED ★ WOMEN ★ KIDS ★&nbsp;</span>
          ))}
        </div>
      </div>

      <div className="portal__cols">
        <aside className="portal__left">
          <section className="box">
            <h2 className="box__title">SHOP BY CATEGORY</h2>
            <ul className="box__list">
              {MENU.map((m) => {
                const n = m.collection ? cat.collections.get(m.collection)?.count : cat.products.length;
                if (!n) return null;
                return (
                  <li key={m.label}>
                    <Link to={m.to ?? collectionPath(m.collection)}>{m.label}</Link> <small>({formatCount(n)})</small>
                  </li>
                );
              })}
            </ul>
          </section>
          <section className="box">
            <h2 className="box__title">IYS CAMERA</h2>
            <button type="button" className="camteaser" onClick={() => useOS.getState().open('camera')} aria-label="Open the IYS Camera DCIM folder">
              <img src={assets.camera[0]?.src} alt="" loading="lazy" />
              <span>DCIM · {assets.camera.length + assets.campaign.length + assets.stores.length} photos</span>
            </button>
          </section>
          <section className="box">
            <h2 className="box__title">GUESTBOOK</h2>
            <p className="box__text muted">{concept.guestbook}</p>
          </section>
        </aside>

        <div className="portal__main">
          <section className="portal__cta" aria-labelledby="portal-cta-title">
            <p className="portal__cta-kicker" id="portal-cta-title">
              {concept.y2k.heroKicker}
            </p>
            <div className="portal__cta-row">
              <button type="button" className="btn btn--go portal__cta-main" onClick={() => navigate('/collections/newest')}>
                {concept.y2k.primary} › <small>{formatCount(cat.collections.get('newest')?.count ?? 0)} new</small>
              </button>
              <button type="button" className="btn btn--sky" onClick={() => navigate('/collections/pjoys')}>
                {concept.y2k.secondary}
              </button>
            </div>
          </section>
          {fw && (
            <figure className="hero hero--fold" ref={fold.hero}>
              <button type="button" className="hero__img" onClick={() => navigate('/collections/newest')} aria-label="Open New Stuff (FW27)">
                <img src={fw.src} alt="In Your Shoe FW27 campaign: two models in brown hoodies beside old computers" width={fw.width} height={fw.height} />
              </button>
              <figcaption>
                <b>FW27</b> - the current IYS campaign (2026), loaded into a 2006 browser.
              </figcaption>
            </figure>
          )}

          <section className="box box--drop" aria-labelledby="portal-drop-title">
            <h2 className="box__title" id="portal-drop-title">
              {concept.y2k.justDropped.toUpperCase()} <span className="new-flag">NEW!</span> <small>from IYS’s own Newest collection</small>
            </h2>
            <ul className="strip">
              {newest.map((p) => (
                <li key={p.handle}>
                  <Link to={productPath(p.handle)}>
                    <span className="strip__media">
                      <Img p={p} local={false} size={240} />
                    </span>
                    <span>{p.title}</span>
                  </Link>
                  <Price price={p.price} compareAt={p.compareAtPrice} />
                </li>
              ))}
            </ul>
            <p className="box__more">
              <Link to="/collections/newest">omg see all {formatCount(cat.collections.get('newest')?.count ?? 0)} new drops :) ›</Link>
            </p>
          </section>

          <section className="box">
            <h2 className="box__title box__title--coral">
              TOP 8 COOL DECISIONS <small>real products · real prices · too cute 2 skip xo</small>
            </h2>
            <ol className="top8">
              {top8.map((p, i) => (
                <li key={p.handle}>
                  <Link to={productPath(p.handle)} className="top8__card">
                    <span className="top8__n">{i + 1}</span>
                    <span className="top8__img">
                      <Img p={p} />
                      {p.onSale && <SaleBadge />}
                    </span>
                    <span className="top8__name">{p.title}</span>
                    <Price price={p.price} compareAt={p.compareAtPrice} />
                  </Link>
                </li>
              ))}
            </ol>
            <p className="box__more">
              <Link to="/shop">{concept.y2k.seeMoreTop8(formatCount(cat.products.length))}</Link>
            </p>
          </section>


          {shelf(0)}
          {shelf(1)}

          <section className="box box--pjoys">
            <h2 className="box__title">
              <Icon name="pjoys" size={24} /> {formatCount(pjoys.length)} PJOYS ONLINE
            </h2>
            <p className="box__text">
              <q>{official.pjoys}</q> <small className="muted">- IYS product description</small>
            </p>
            <ul className="strip strip--tight">
              {pjoys.slice(0, 6).map((p) => (
                <li key={p.handle}>
                  <Link to={productPath(p.handle)}>
                    <span className="strip__media">
                      <Img p={p} size={240} />
                    </span>
                    <span>{p.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="box__more">
              <Link to="/collections/pjoys">{concept.y2k.secondary} ›</Link> · <Link to="/collections/fluffy-pjoys">Fluffy Pjoys ({formatCount(cat.collections.get('fluffy-pjoys')?.count ?? 0)}) ›</Link>
            </p>
          </section>

          {shelf(2)}
          {shelf(3)}

          <section className="box box--cairo">
            <h2 className="box__title">
              C:\IYS\CAIRO\ <span lang="ar" dir="rtl" className="arabic">القاهرة</span>
            </h2>
            <ul className="strip strip--tight">
              {cairo.map((p) => (
                <li key={p.handle}>
                  <Link to={productPath(p.handle)}>
                    <span className="strip__media">
                      <Img p={p} size={240} />
                    </span>
                    <span>{p.title}</span>
                  </Link>
                  <Price price={p.price} compareAt={p.compareAtPrice} />
                </li>
              ))}
            </ul>
            <p className="box__more">
              <Link to="/collections/cairo">{concept.y2k.shopCairo(formatCount(cat.collections.get('cairo')?.count ?? 0))}</Link>
            </p>
          </section>

          {shelf(4)}

          {zed && (
            <figure className="hero hero--small">
              <button type="button" className="hero__img" onClick={() => navigate('/collections/inyourshoexzed')} aria-label="Open IYS × ZED collection">
                <img src={zed.src} alt="IYS × ZED campaign: green lockers with stickers" width={zed.width} height={zed.height} loading="lazy" />
              </button>
              <figcaption>
                <b>IYS × ZED</b> - current collaboration on inyourshoe.com. <Link to="/collections/inyourshoexzed">{concept.y2k.openCollection(formatCount(cat.collections.get('inyourshoexzed')?.count ?? 0))}</Link>
              </figcaption>
            </figure>
          )}
        </div>

        <aside className="portal__right">
          <section className="box">
            <h2 className="box__title">CURRENTLY ONLINE</h2>
            <ul className="buddies-mini">
              {BUDDIES.filter((b) => (cat.collections.get(b.collection)?.count ?? 0) > 0).map((b) => (
                <li key={b.id}>
                  <button type="button" onClick={() => openChat(b.id, b.name)}>
                    <span className={`orb orb--${b.status}`} aria-hidden="true" />
                    <b>{b.name}</b> <small>({b.status})</small>
                  </button>
                </li>
              ))}
            </ul>
            <p className="box__text muted">Status is concept UI, not stock data.</p>
          </section>
          <section className="box">
            <h2 className="box__title">STORES</h2>
            <p className="box__text">
              <b>{storesData.storeCount}</b> IYS stores in Egypt.
            </p>
            <p className="box__more">
              <Link to="/stores">{concept.y2k.stores} ›</Link>
            </p>
          </section>
          <section className="box">
            <h2 className="box__title">IYS NEWSLETTER</h2>
            <p className="box__text">
              <b>{concept.y2k.newsletterTitle}</b>
            </p>
            <p className="box__text">{official.coolList}</p>
            <button type="button" className="btn btn--go btn--small" onClick={() => useOS.getState().open('newsletter')}>
              <Icon name="newsletter" size={16} /> {concept.y2k.newsletterCta}
            </button>
          </section>
          <section className="box">
            <h2 className="box__title">{concept.counterLabel}</h2>
            <p className="counter" aria-label="Fictional counter: 002006">
              {'002006'.split('').map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </p>
            <p className="box__text muted">{concept.counterNote}</p>
          </section>
          <div className="badges">
            <WebBadge label="IYS ONLINE" sub="since you got here" />
            <WebBadge label="PJOYS" sub="super joyful" tone="coral" />
            <WebBadge label="CAIRO" sub="is a mindset" tone="ink" />
            <WebBadge label="COOL" sub="DECISION" tone="green" />
          </div>
        </aside>
      </div>

      <footer className="portal__foot">
        <p>
          <b>{concept.disclaimer[0]}</b> {concept.disclaimer[1]} {concept.disclaimer[2]}
        </p>
        <p>{concept.disclaimer[3]}</p>
        <p className="muted">
          Catalogue snapshot: {formatCount(cat.products.length)} public products, EGP, {cat.generatedAt.slice(0, 10)}. Best viewed in IYS INTERNET at 1024×768 or higher.
        </p>
        <EssentialLinks className="muted" label="IYS ESSENTIALS:" ids={['exchange-refund', 'shipping', 'terms-conditions', 'terms-of-service', 'privacy']} more />
        <p className="catchy">{concept.catchy.footer}</p>
      </footer>
    </div>
  );
}
