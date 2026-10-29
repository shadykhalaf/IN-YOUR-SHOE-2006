import { useEffect, useId, useMemo, useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import { formatCount, formatEGP } from '../../lib/catalogue/format';
import { useCatalogue } from '../../lib/catalogue/load';
import type { SuggestResult } from '../../lib/catalogue/suggest';
import type { Product } from '../../lib/catalogue/types';
import { freshPicks, searchShortcuts } from '../../lib/merch';
import { collectionPath, productPath } from '../../lib/useBrowse';
import { Icon } from '../os/Icon';
import { Price, SaleBadge } from './Price';
import { RemoteImage } from './RemoteImage';
import '../../styles/search.css';

/*
 * Search assistance for the ONE search (IYS INTERNET › Search on the desktop,
 * IYS MOBILE › SEARCH on phones): suggestions while typing, FRESH PICKS while
 * the box is empty. Suggestions come from lib/catalogue/suggest.ts (its own
 * small chunk, warmed when a search box appears); a typo with no match falls
 * back to the main search's own closest results. Choosing a suggestion never
 * picks a size and never adds anything to the bag.
 */

type SuggestModule = typeof import('../../lib/catalogue/suggest');
let suggestModule: SuggestModule | null = null;
let suggestLoading: Promise<SuggestModule> | null = null;
const loadSuggest = () => (suggestLoading ??= import('../../lib/catalogue/suggest').then((m) => (suggestModule = m)));
const whenIdle = (fn: () => void) => {
  if ('requestIdleCallback' in window) window.requestIdleCallback(fn, { timeout: 1500 });
  else setTimeout(fn, 200);
};

function useSuggestModule(): SuggestModule | null {
  const cat = useCatalogue();
  const [, setLoaded] = useState(Boolean(suggestModule));
  useEffect(() => {
    let alive = true;
    void loadSuggest().then((m) => {
      if (!alive) return;
      setLoaded(true);
      // build the index while nobody is typing, so the first letter answers at once
      if (cat) whenIdle(() => m.getSuggester(cat));
    });
    return () => {
      alive = false;
    };
  }, [cat]);
  return suggestModule;
}

const NO_PRODUCTS: Product[] = [];

/**
 * What to suggest for `text`: null until the suggester is ready; `fuzzy` only
 * when nothing matched directly (the main search's closest results), and
 * `pending` while those are still being looked up (so "no matches" never flashes first).
 */
export function useSuggestions(text: string): { result: SuggestResult | null; fuzzy: Product[]; pending: boolean } {
  const cat = useCatalogue();
  const mod = useSuggestModule();
  const result = useMemo(() => (mod && cat && text.trim() ? mod.getSuggester(cat).suggest(text) : null), [mod, cat, text]);
  const empty = Boolean(result && mod?.isEmptyResult(result));
  const q = result?.query ?? '';
  const [fuzzy, setFuzzy] = useState<{ q: string; items: Product[] } | null>(null);
  useEffect(() => {
    if (!empty || !cat || q.length < 3) return;
    let alive = true;
    void import('../../lib/catalogue/search').then(async ({ getSearcher }) => {
      const items = (await getSearcher(cat)).search(q).slice(0, 3);
      if (alive) setFuzzy({ q, items });
    });
    return () => {
      alive = false;
    };
  }, [empty, cat, q]);
  const looking = empty && q.length >= 3 && fuzzy?.q !== q;
  return { result, fuzzy: empty && fuzzy?.q === q ? fuzzy.items : NO_PRODUCTS, pending: looking };
}

export type SearchChoice = { kind: 'term'; query: string } | { kind: 'collection'; handle: string } | { kind: 'product'; handle: string };
type Group = 'terms' | 'collections' | 'products' | 'closest';
interface Option {
  choice: SearchChoice;
  group: Group;
  label: string;
  node: ReactNode;
}
const GROUP_LABEL: Record<Group, string> = { terms: 'SEARCH FOR', collections: 'IN THE SHOP', products: 'PRODUCTS', closest: 'CLOSEST MATCHES' };

/** "hoo" + "hoodie" → hoo<b>die</b>, the way 2000s search suggestions showed what they'd add. */
function Completion({ text, typed }: { text: string; typed: string }) {
  const t = typed.trimStart().toLowerCase();
  if (t && text.toLowerCase().startsWith(t) && t.length < text.length)
    return (
      <>
        {text.slice(0, t.length)}
        <b>{text.slice(t.length)}</b>
      </>
    );
  return <b>{text}</b>;
}

function ProductRow({ p }: { p: Product }) {
  return (
    <>
      <span className="suggest__thumb">
        <RemoteImage src={p.image} alt="" title={p.title} base={120} sizes="40px" max={240} />
      </span>
      <span className="suggest__ptext">
        <span className="suggest__pname">{p.title}</span>
        <span className="suggest__pmeta">
          <Price price={p.price} compareAt={p.compareAtPrice} />
          {p.available === false && <span className="suggest__out">sold out</span>}
        </span>
      </span>
    </>
  );
}

function buildOptions(result: SuggestResult | null, fuzzy: Product[], typed: string): Option[] {
  if (!result) return [];
  const terms: Option[] = result.terms.map((t) => ({
    choice: { kind: 'term', query: t.query },
    group: 'terms',
    label: `Search for ${t.query}${t.understood ? ` (${t.understood})` : ''}`,
    node: (
      <>
        <Icon name="search" size={16} />
        <span className="suggest__text" dir="auto">
          <Completion text={t.query} typed={typed} />
        </span>
        {t.understood && <small className="suggest__note">= {t.understood}</small>}
      </>
    ),
  }));
  const collections: Option[] = result.collections.map((c) => ({
    choice: { kind: 'collection', handle: c.handle },
    group: 'collections',
    label: `${c.title}, ${formatCount(c.count)} products`,
    node: (
      <>
        <Icon name="folder" size={16} />
        <span className="suggest__text">{c.title}</span>
        <small className="suggest__note">{formatCount(c.count)} pieces ›</small>
      </>
    ),
  }));
  const product = (group: Group) => (p: Product): Option => ({
    choice: { kind: 'product', handle: p.handle },
    group,
    label: `${p.title}, ${formatEGP(p.price)}${p.available === false ? ', sold out' : ''}`,
    node: <ProductRow p={p} />,
  });
  const products = result.products.map(product('products'));
  const closest = fuzzy.map(product('closest'));
  return result.exact ? [...products, ...terms, ...collections] : [...terms, ...collections, ...products, ...closest];
}

/**
 * The search box's combobox (ARIA 1.2 list autocomplete): typing never gets
 * overwritten; ↓/↑ move through suggestions (past the last one = back to what
 * was typed), Enter opens the highlighted one or searches what was typed, Esc
 * closes the list and keeps the text, Tab moves on. Mouse and touch pick a row
 * without the input losing focus first. `popup` floats under the box (desktop),
 * `inline` sits in the page under the form (IYS MOBILE, never past the screen).
 */
export function useSearchCombobox({ value, onChange, onChoose, layout }: { value: string; onChange: (v: string) => void; onChoose: (c: SearchChoice) => void; layout: 'popup' | 'inline' }) {
  const base = useId();
  const listId = `${base}-list`;
  const { result, fuzzy, pending } = useSuggestions(value);
  const options = useMemo(() => buildOptions(result, fuzzy, value), [result, fuzzy, value]);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [active, setActive] = useState(-1);
  const [announce, setAnnounce] = useState('');
  const open = focused && !dismissed && Boolean(value.trim()) && Boolean(result) && !pending;
  const showList = open && options.length > 0;

  useEffect(() => setActive(-1), [options]);
  useEffect(() => setDismissed(false), [value]);
  // say how many suggestions there are, once typing settles (never for every letter)
  useEffect(() => {
    const t = window.setTimeout(() => setAnnounce(!open ? '' : options.length ? `${options.length} suggestion${options.length === 1 ? '' : 's'}. Up and down arrows to review, Enter to open.` : `No suggestions for ${result?.query ?? ''}.`), 350);
    return () => window.clearTimeout(t);
  }, [open, options.length, result?.query]);

  const choose = (o: Option) => {
    setDismissed(true);
    setActive(-1);
    onChoose(o.choice);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!options.length) return;
      e.preventDefault();
      if (!showList) {
        setDismissed(false);
        setActive(e.key === 'ArrowDown' ? 0 : options.length - 1);
        return;
      }
      setActive((a) => (e.key === 'ArrowDown' ? (a + 1 >= options.length ? -1 : a + 1) : a <= -1 ? options.length - 1 : a - 1));
    } else if (e.key === 'Enter') {
      const o = showList && active >= 0 ? options[active] : undefined;
      if (o) {
        e.preventDefault();
        choose(o);
      } else setDismissed(true); // the form searches what was typed
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault(); // keeps the text (a search field would clear itself)
        e.stopPropagation();
        setDismissed(true);
        setActive(-1);
      }
    } else if (e.key === 'Tab') setDismissed(true);
  };

  const inputProps = {
    value,
    onChange: (e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
    onKeyDown,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    role: 'combobox' as const,
    'aria-autocomplete': 'list' as const,
    'aria-expanded': showList,
    'aria-controls': showList ? listId : undefined,
    'aria-activedescendant': showList && active >= 0 ? `${listId}-${active}` : undefined,
    autoComplete: 'off',
    autoCorrect: 'off',
    spellCheck: false,
    dir: 'auto', // Arabic typed right-to-left, English left-to-right
  };

  let index = 0;
  const groups = (['terms', 'collections', 'products', 'closest'] as Group[])
    .map((g) => ({ g, items: options.filter((o) => o.group === g) }))
    .filter((x) => x.items.length)
    .sort((a, b) => options.indexOf(a.items[0]!) - options.indexOf(b.items[0]!));
  const panel = open ? (
    // mousedown here would blur the box before the click lands: keep the focus where it is
    <div className={`suggest__pop suggest__pop--${layout}`} onMouseDown={(e) => e.preventDefault()}>
      {result?.understood && (
        <p className="suggest__understood">
          IYS understood: <b>{result.understood.join(' · ')}</b>
        </p>
      )}
      {showList ? (
        <div role="listbox" id={listId} aria-label={`Suggestions for ${result?.query ?? value}`} className="suggest__list">
          {groups.map(({ g, items }) => (
            <div key={g} role="group" aria-labelledby={`${listId}-${g}`}>
              <div className="suggest__head" id={`${listId}-${g}`}>
                {GROUP_LABEL[g]}
              </div>
              {items.map((o) => {
                const i = index++;
                return (
                  <div
                    key={`${o.choice.kind}:${'query' in o.choice ? o.choice.query : o.choice.handle}`}
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={i === active}
                    aria-label={o.label}
                    className={`suggest__opt suggest__opt--${o.choice.kind}`}
                    onMouseMove={() => i !== active && setActive(i)}
                    onClick={() => choose(o)}
                  >
                    {o.node}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        <p className="suggest__none">
          No exact matches for “<bdi>{result?.query}</bdi>” in this snapshot.{' '}
          <Link to="/shop" onClick={() => setDismissed(true)}>
            Browse SHOP ALL ›
          </Link>
        </p>
      )}
    </div>
  ) : null;
  const status = (
    <span className="sr-only" role="status" aria-live="polite">
      {announce}
    </span>
  );
  return { inputProps, panel, status, open, close: () => setDismissed(true) };
}

/** Empty search box: FRESH PICKS 4 U (newest of each kind, real), real categories, SHOP ALL. */
export function FreshPicks({ variant }: { variant: 'desktop' | 'mobile' }) {
  const cat = useCatalogue();
  const picks = useMemo(() => (cat ? freshPicks(cat, 6) : []), [cat]);
  const cats = useMemo(() => (cat ? searchShortcuts(cat) : []), [cat]);
  if (!cat) return null;
  const card = (p: Product, cls: { card: string; img: string; name: string }) => (
    <li key={p.handle}>
      <Link to={productPath(p.handle)} className={cls.card}>
        <span className={cls.img}>
          <RemoteImage src={p.image} alt="" title={p.title} base={240} sizes={variant === 'mobile' ? '128px' : '150px'} max={480} />
          {p.onSale && <SaleBadge />}
        </span>
        <span className={cls.name}>{p.title}</span>
        <Price price={p.price} compareAt={p.compareAtPrice} />
      </Link>
    </li>
  );
  const chips = (cls: string) => (
    <ul className={cls}>
      {cats.map((c) => (
        <li key={c.handle}>
          <Link to={collectionPath(c.handle)} className="fresh__chip">
            <Icon name={c.handle.includes('pjoys') ? 'pjoys' : 'folder'} size={16} />
            {c.title} <small>({formatCount(c.count)})</small>
          </Link>
        </li>
      ))}
    </ul>
  );
  if (variant === 'mobile')
    return (
      <section className="m-panel m-fresh" aria-labelledby="m-fresh-title">
        <h2 className="m-panel__title" id="m-fresh-title">
          fresh picks 4 u ✧ <small className="m-panel__note">newest of each kind</small>
        </h2>
        <ul className="m-drop">{picks.map((p) => card(p, { card: 'm-drop__card', img: 'm-drop__img', name: 'm-drop__name' }))}</ul>
        <h3 className="m-fresh__sub">CATEGORIES</h3>
        {chips('fresh__chips')}
        <Link to="/shop" className="m-panel__more">
          SHOP ALL ({formatCount(cat.products.length)}) ›
        </Link>
      </section>
    );
  return (
    <section className="box fresh" aria-labelledby="fresh-title">
      <h2 className="box__title" id="fresh-title">
        FRESH PICKS 4 U ✧ <small>the newest of each kind in IYS’s own NEW DROPS · real prices</small>
      </h2>
      <ul className="fresh__grid">{picks.map((p) => card(p, { card: 'top8__card', img: 'top8__img', name: 'top8__name' }))}</ul>
      <h3 className="fresh__sub">START WITH A CATEGORY</h3>
      {chips('fresh__chips')}
      <p className="box__more">
        <Link to="/shop">or browse all {formatCount(cat.products.length)} products ›</Link>
      </p>
    </section>
  );
}
