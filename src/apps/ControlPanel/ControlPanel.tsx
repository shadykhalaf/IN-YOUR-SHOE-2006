import { useEffect, useRef, useState } from 'react';
import { Icon } from '../../components/os/Icon';
import { Window } from '../../components/os/Window';
import { brand, WALLPAPERS } from '../../data/assets';
import meta from '../../data/catalogue-meta.json';
import storesData from '../../data/stores.generated.json';
import { concept, OFFICIAL_VERIFIED_ON } from '../../data/copy';
import { formatCount } from '../../lib/catalogue/format';
import { play, unlockAudio } from '../../lib/sound';
import { useOS, type Win } from '../../state/os';
import { usePreferences, type WallpaperMode } from '../../state/preferences';
import { useCatchyEnabled, writeEnabled } from '../../features/catchy/storage';
import { CatchySticker } from '../../games/shared/catchy';

const TABS = ['Wallpaper', 'Sound', 'Screen', 'Catchy', 'Time Machine', 'System', 'About'] as const;
type Tab = (typeof TABS)[number];

export default function ControlPanel({ win }: { win: Win }) {
  const [tab, setTab] = useState<Tab>((win.props.tab as Tab) ?? 'Wallpaper');
  const catchy = useCatchyEnabled();
  const prefs = usePreferences();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // A saved preset id that no longer exists falls back to the default (as the desktop does).
  const wp = prefs.wallpaper;
  const currentId = wp.kind === 'preset' ? (WALLPAPERS.some((w) => w.id === wp.id) ? wp.id : WALLPAPERS[0]!.id) : 'custom';
  const customSrc = prefs.wallpaper.kind === 'image' ? prefs.wallpaper.src : null;
  const [choice, setChoice] = useState(currentId);
  const [mode, setMode] = useState<WallpaperMode>(prefs.wallpaperMode);
  // Keep the selection in step with the real wallpaper (e.g. “Set as Wallpaper” while this window is open).
  useEffect(() => {
    setChoice(currentId);
    setMode(prefs.wallpaperMode);
  }, [currentId, customSrc, prefs.wallpaperMode]);
  const preview = choice === 'custom' && prefs.wallpaper.kind === 'image' ? prefs.wallpaper.src : WALLPAPERS.find((w) => w.id === choice)?.src ?? null;

  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (i + d + TABS.length) % TABS.length;
    setTab(TABS[n]!);
    tabRefs.current[n]?.focus();
  };

  const apply = () => {
    if (choice === 'custom') prefs.setWallpaperMode(mode);
    else {
      const preset = WALLPAPERS.find((w) => w.id === choice) ?? WALLPAPERS[0]!;
      prefs.setWallpaper({ kind: 'preset', id: preset.id }, preset.mode);
    }
    useOS.getState().notify(concept.wallpaperUpdated);
    play('done');
  };

  return (
    <Window win={win} icon="control" resizable={false}>
      <div className="props-sheet">
        <div className="tabs" role="tablist" aria-label="Control panel sections">
          {TABS.map((t, i) => (
            <button
              key={t}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`cp-tab-${i}`}
              aria-selected={tab === t}
              aria-controls={`cp-panel-${i}`}
              tabIndex={tab === t ? 0 : -1}
              className="tabs__tab"
              onClick={() => setTab(t)}
              onKeyDown={(e) => onTabKey(e, i)}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="tabs__panel" role="tabpanel" id={`cp-panel-${TABS.indexOf(tab)}`} aria-labelledby={`cp-tab-${TABS.indexOf(tab)}`}>
          {tab === 'Wallpaper' && (
            <div className="cp-wall">
              <div className="monitor" aria-hidden="true">
                <div className={`monitor__screen monitor__screen--${choice === 'custom' ? mode : WALLPAPERS.find((w) => w.id === choice)?.mode ?? 'stretch'}`} style={preview ? { backgroundImage: `url("${preview}")` } : undefined} />
              </div>
              <fieldset className="fieldset">
                <legend>Background</legend>
                <div className="cp-list" role="radiogroup">
                  {WALLPAPERS.map((w) => (
                    <label key={w.id} className="field-row">
                      <input type="radio" className="radio" name="wp" checked={choice === w.id} onChange={() => setChoice(w.id)} />
                      {w.label}
                    </label>
                  ))}
                  {prefs.wallpaper.kind === 'image' && (
                    <label className="field-row">
                      <input type="radio" className="radio" name="wp" checked={choice === 'custom'} onChange={() => setChoice('custom')} />
                      Current: {prefs.wallpaper.title}
                    </label>
                  )}
                </div>
              </fieldset>
              {choice === 'custom' && (
                <label className="field-row">
                  Position:
                  <select className="select" value={mode} onChange={(e) => setMode(e.target.value as WallpaperMode)}>
                    <option value="stretch">Stretch</option>
                    <option value="center">Center</option>
                    <option value="tile">Tile</option>
                  </select>
                </label>
              )}
              <p className="muted small">Tip: right-click any product photo (or use Shift+F10) and choose “Set as Wallpaper”.</p>
              <div className="cp-actions">
                <button type="button" className="btn btn--primary" onClick={apply}>
                  Apply
                </button>
              </div>
            </div>
          )}
          {tab === 'Sound' && (
            <fieldset className="fieldset">
              <legend>
                <Icon name="speaker" size={16} /> Sound
              </legend>
              <label className="field-row">
                <input
                  type="checkbox"
                  className="check"
                  checked={prefs.sound}
                  onChange={(e) => {
                    prefs.setSound(e.target.checked);
                    if (e.target.checked) {
                      unlockAudio();
                      play('ping');
                    }
                  }}
                />
                Play system sounds
              </label>
              <p className="muted small">Off by default. Original synthesized sounds (Web Audio) - no recordings, no music.</p>
              <div className="cp-actions">
                {(['click', 'open', 'ping', 'error', 'done', 'shutter', 'modem', 'boot'] as const).map((s) => (
                  <button key={s} type="button" className="btn btn--small" disabled={!prefs.sound} onClick={() => play(s)}>
                    ▶ {s}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          {tab === 'Screen' && (
            <fieldset className="fieldset">
              <legend>CRT filter</legend>
              <label className="field-row">
                <input type="checkbox" className="check" checked={prefs.crt} onChange={(e) => prefs.setCrt(e.target.checked)} />
                CRT FILTER (scanlines + vignette)
              </label>
              <p className="muted small">Always very subtle after boot, never on top of product colours strongly enough to change them. Reduced-motion users get it static.</p>
            </fieldset>
          )}
          {tab === 'Catchy' && (
            <fieldset className="fieldset">
              <legend>Catchy desktop buddy</legend>
              <label className="field-row">
                <input type="checkbox" className="check" checked={catchy} onChange={(e) => writeEnabled(e.target.checked)} />
                Show Catchy on the desktop
              </label>
              <p className="muted small cp-catchy">
                <CatchySticker size={32} /> CATCHY.EXE naps, wanders and reacts to MY BAG, IYS GAMES and REAL IYS. Drag him around, or right-click him for a tiny menu. Everything stays on this device. Sounds follow the Sound tab.
              </p>
            </fieldset>
          )}
          {tab === 'Time Machine' && (
            <div className="cp-tm">
              <p className="cp-tm__year" aria-label={`Target year ${concept.targetYear}`}>
                {concept.targetYear}
              </p>
              <p>
                <b>TARGET YEAR: {concept.targetYear}</b>
              </p>
              <p className="muted small">Only one destination is installed. Your real clock keeps today’s date - the clothes are from now, the computer is from then.</p>
            </div>
          )}
          {tab === 'System' && (
            <table className="props__table">
              <caption className="sr-only">Catalogue snapshot</caption>
              <tbody>
                <tr>
                  <th scope="row">Storefront</th>
                  <td>
                    {meta.storefront} ({meta.market}, {meta.currency})
                  </td>
                </tr>
                <tr>
                  <th scope="row">Snapshot</th>
                  <td>{new Date(meta.generatedAt).toUTCString()}</td>
                </tr>
                <tr>
                  <th scope="row">Public products</th>
                  <td>{formatCount(meta.publicProductsTotal)}</td>
                </tr>
                <tr>
                  <th scope="row">In IYS “All Products”</th>
                  <td>{formatCount(meta.allProductsCollectionCount)}</td>
                </tr>
                <tr>
                  <th scope="row">Outside All Products</th>
                  <td>{formatCount(meta.productsOutsideAllProducts.count)} (collaboration capsules)</td>
                </tr>
                <tr>
                  <th scope="row">Variants</th>
                  <td>{formatCount(meta.variantsTotal)}</td>
                </tr>
                <tr>
                  <th scope="row">Stores</th>
                  <td>{storesData.storeCount}</td>
                </tr>
                <tr>
                  <th scope="row">Sources</th>
                  <td>{meta.sourceMethods.join(', ')}</td>
                </tr>
                <tr>
                  <th scope="row">Official copy checked</th>
                  <td>{OFFICIAL_VERIFIED_ON}</td>
                </tr>
              </tbody>
            </table>
          )}
          {tab === 'About' && (
            <div className="cp-about">
              <img src={brand.mark} alt="IYS" width={64} height={64} />
              <div>
                <p>
                  <b>{concept.name}</b> - {concept.os}
                </p>
                <p>{concept.thesis}</p>
                {concept.disclaimer.map((d) => (
                  <p key={d} className="small">
                    {d}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="cp-foot">
          <button type="button" className="btn" onClick={() => useOS.getState().showDialog({ kind: 'confirm-reset' })}>
            Reset desktop...
          </button>
          <button type="button" className="btn" onClick={() => useOS.getState().close(win.id)}>
            Close
          </button>
        </div>
      </div>
    </Window>
  );
}
