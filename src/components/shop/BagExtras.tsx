import { useEffect, useId, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { FEATURES } from '../../config/features';
import { FREE_SHIPPING, OFFERS } from '../../config/promotions';
import { concept } from '../../data/copy';
import { formatEGP } from '../../lib/catalogue/format';
import { useCatalogue } from '../../lib/catalogue/load';
import type { Product } from '../../lib/catalogue/types';
import { useHandoff } from '../../lib/checkout';
import { commerceMode, liveFreeShipping, verifyDiscount } from '../../lib/commerce';
import { activeOffers, cleanCode, shippingProgress, today } from '../../lib/incentives';
import { bagIdeas } from '../../lib/recommend';
import { productPath } from '../../lib/useBrowse';
import { subtotal, useCart } from '../../state/cart';
import { addToBag, quickRequest } from '../../state/status';
import { Busy } from './Busy';
import { ProductCarousel } from './ProductCarousel';
import { Price } from './Price';
import { RemoteImage } from './RemoteImage';

/** The verified static rule, replaced by the store's live Shopify discount when live mode finds one. */
function useFreeShippingRule() {
  const [live, setLive] = useState<typeof FREE_SHIPPING>(null);
  useEffect(() => {
    let alive = true;
    liveFreeShipping(today()).then((r) => alive && setLive(r));
    return () => {
      alive = false;
    };
  }, []);
  return live ?? FREE_SHIPPING;
}

/**
 * Free-shipping progress: only from the merchant's verified rule
 * (src/config/promotions.ts), hidden when there's no rule or it needs
 * re-verifying. Always qualified: IYS confirms shipping at checkout.
 */
export function ShippingProgress() {
  const items = useCart((s) => s.items);
  const rule = useFreeShippingRule();
  if (!FEATURES.bagIncentives) return null;
  const sp = shippingProgress(subtotal(items), rule, today());
  if (sp.kind === 'hidden') return null;
  const unlocked = sp.kind === 'unlocked';
  const pct = unlocked ? 100 : sp.pct;
  return (
    <div className={`bagx-ship${unlocked ? ' is-unlocked' : ''}`} role="status" aria-live="polite">
      <p className="bagx-ship__line">{unlocked ? concept.bag.shipUnlocked : sp.remaining > 0 ? concept.bag.shipLeft(formatEGP(sp.remaining)) : concept.bag.shipJust}</p>
      <div className="progress bagx-ship__bar" aria-hidden="true" style={{ ['--p' as string]: `${pct}%` }}>
        <div className="progress__bar" />
      </div>
      <p className="bagx-note">{concept.bag.shipNote(formatEGP(sp.threshold), rule!.verifiedOn, rule!.inclusive === true)}</p>
    </div>
  );
}

/** Merchant offers that are live today (config only; empty = nothing shown). */
export function BagOffers() {
  if (!FEATURES.bagIncentives) return null;
  const offers = activeOffers(OFFERS, today());
  if (!offers.length) return null;
  return (
    <div className="bagx-offers">
      <p className="bagx-title">{concept.bag.offersTitle}</p>
      <ul>
        {offers.map((o) => (
          <li key={o.id}>
            <b>{o.title}</b>
            {o.code && <code> {o.code}</code>}
            {o.conditions && <small> · {o.conditions}</small>}
          </li>
        ))}
      </ul>
    </div>
  );
}

type CodeCheck = { state: 'idle' } | { state: 'checking' } | { state: 'applies' | 'does-not-apply' | 'unchecked'; code: string } | { state: 'bad' };

/**
 * GOT A CODE? The code is handed to Shopify with the bag (cart permalink
 * ?discount=). In snapshot mode nobody can check it from here, and the UI says
 * so. In live mode, Shopify's own cart answers whether it applies.
 */
export function PromoCode() {
  const id = useId();
  const code = useCart((s) => s.discountCode);
  const items = useCart((s) => s.items);
  const setCode = useCart((s) => s.setDiscountCode);
  const [open, setOpen] = useState(Boolean(code));
  const [typed, setTyped] = useState(code ?? '');
  const [check, setCheck] = useState<CodeCheck>(code ? { state: 'unchecked', code } : { state: 'idle' });
  const live = commerceMode() === 'live';

  const apply = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = cleanCode(typed);
    if (!c) return setCheck({ state: 'bad' });
    setCode(c);
    setTyped(c);
    if (!live) return setCheck({ state: 'unchecked', code: c });
    setCheck({ state: 'checking' });
    const r = await verifyDiscount(items, c);
    setCheck({ state: r, code: c });
  };
  if (!FEATURES.bagIncentives) return null;
  return (
    <div className="bagx-code">
      <button type="button" className="link bagx-code__toggle" aria-expanded={open} aria-controls={`${id}-code`} onClick={() => setOpen((o) => !o)}>
        {concept.bag.codeToggle}
      </button>
      {open && (
        <form id={`${id}-code`} className="bagx-code__form" onSubmit={apply}>
          <label htmlFor={`${id}-input`} className="sr-only">
            {concept.bag.codeLabel}
          </label>
          <input id={`${id}-input`} className="input" value={typed} maxLength={64} autoComplete="off" autoCapitalize="characters" spellCheck={false} onChange={(e) => setTyped(e.target.value)} />
          <button type="submit" className="btn btn--small" disabled={check.state === 'checking'}>
            {concept.bag.codeApply}
          </button>
          {code && (
            <button
              type="button"
              className="link"
              onClick={() => {
                setCode(null);
                setTyped('');
                setCheck({ state: 'idle' });
              }}
            >
              {concept.bag.codeRemove}
            </button>
          )}
          <p className="bagx-note" role="status" aria-live="polite">
            {check.state === 'checking' && <Busy inline label="Checking with IYS..." />}
            {check.state === 'bad' && concept.bag.codeBad}
            {check.state === 'unchecked' && concept.bag.codeSaved(check.code)}
            {check.state === 'applies' && concept.bag.codeLiveOk(check.code)}
            {check.state === 'does-not-apply' && concept.bag.codeLiveNo(check.code)}
          </p>
        </form>
      )}
    </div>
  );
}

/** One idea card: sizes are never preselected; multi-option items go to their page. */
function IdeaCard({ p, because, onOpen }: { p: Product; because: string; onOpen: (handle: string) => void }) {
  const [size, setSize] = useState<string | null>(null);
  const sizes = p.sizes.filter((s) => s.variantId !== null);
  const single = sizes.length > 0 && !p.optionNames;
  const chosen = sizes.find((s) => s.label === size) ?? null;
  const req = single ? (chosen ? quickRequest(p, chosen) : null) : !p.optionNames && !p.sizes.length ? quickRequest(p) : null;
  return (
    <li className="reco__item bagx-idea">
      <Link to={productPath(p.handle)} className="reco__img bagx-idea__img" onClick={(e) => (e.preventDefault(), onOpen(p.handle))} tabIndex={-1} aria-hidden="true">
        <RemoteImage src={p.image} alt="" title={p.title} width={p.imageWidth} height={p.imageHeight} base={240} sizes="132px" max={480} />
      </Link>
      <button type="button" className="link reco__name bagx-idea__name" onClick={() => onOpen(p.handle)}>
        {p.title}
      </button>
      <Price price={p.price} compareAt={p.compareAtPrice} />
      <small className="reco__why">{because}</small>
      {single && (
        // never preselected: the shopper picks the size before + ADD appears
        <span className="bagx-idea__sizes" role="group" aria-label={`Size for ${p.title}`} data-repeatable>
          {sizes.map((s) => (
            <button key={s.label} type="button" className="btn btn--small" aria-pressed={size === s.label} disabled={!s.available} onClick={() => setSize(s.label)}>
              {s.label}
            </button>
          ))}
        </span>
      )}
      {req ? (
        <button type="button" className="btn btn--go btn--small" onClick={() => addToBag(req)}>
          {concept.bag.upsellAdd}
          {single && chosen ? ` (${chosen.label})` : ''}
        </button>
      ) : single ? (
        <small className="muted">{concept.y2k.pickSizeFirst}</small>
      ) : (
        <button type="button" className="btn btn--small" onClick={() => onOpen(p.handle)}>
          {concept.bag.upsellOptions}
        </button>
      )}
    </li>
  );
}

/** "U MIGHT ALSO LIKE": up to 10 deterministic, in-stock real pieces (src/lib/recommend.ts), as a sideways carousel. */
export function BagIdeas({ onOpenProduct, variant = 'desktop' }: { onOpenProduct: (handle: string) => void; variant?: 'desktop' | 'mobile' }) {
  const cat = useCatalogue();
  const items = useCart((s) => s.items);
  const handles = items.map((i) => i.handle).join(',');
  const picks = useMemo(() => (cat && FEATURES.bagUpsell ? bagIdeas(cat, handles ? handles.split(',') : []) : []), [cat, handles]);
  if (!picks.length) return null;
  return (
    <div className="bagx-ideas">
      <ProductCarousel title={concept.bag.upsellTitle} note={concept.reco.bagNote} count={picks.length} variant={variant}>
        {picks.map((x) => (
          <IdeaCard key={x.product.handle} p={x.product} because={x.because} onOpen={onOpenProduct} />
        ))}
      </ProductCarousel>
    </div>
  );
}

/** While CHECKOUT / REAL IYS is redirecting: the shared busy look, then a direct link if it's slow. */
export function HandoffStatus() {
  const pending = useHandoff((s) => s.pending);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    setSlow(false);
    if (!pending) return;
    const t = window.setTimeout(() => setSlow(true), 6000);
    return () => window.clearTimeout(t);
  }, [pending]);
  if (!pending) return null;
  return (
    <p className="bagx-handoff">
      <Busy inline label={pending.to === 'checkout' ? concept.bag.handoffCheckout : concept.bag.handoffReal} from="bag" to="internet" />
      {slow && (
        <>
          {' '}
          {concept.bag.handoffSlow}{' '}
          <a href={pending.url} rel="noopener">
            {concept.bag.handoffDirect}
          </a>
        </>
      )}
    </p>
  );
}

/** Is a handoff in flight? (to disable CHECKOUT) */
export const useHandoffPending = () => useHandoff((s) => Boolean(s.pending));
