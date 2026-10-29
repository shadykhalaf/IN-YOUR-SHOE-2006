import { useState } from 'react';
import { CATCHY_SIZE, CATCHY_URI } from '../art';
import REFERENCE from './catchy-reference.png';

/**
 * DEV ONLY (/catchy-compare): the supplied Catchy reference, the canonical
 * cut-out and a 50/50 overlay at the same scale, plus the common sizes.
 * Never linked from the site and stripped from production builds.
 */
const REF = { w: 270, h: 187 };
/** Where the cut-out sits inside the reference photo (px). */
const AT = { x: 70, y: 36 };
const Z = 3;

export default function CatchyCompare() {
  const [opacity, setOpacity] = useState(0.5);
  const frame = (children: React.ReactNode, label: string, checker = false) => (
    <figure style={{ margin: 0, textAlign: 'center', font: '600 14px sans-serif' }}>
      <div style={{ position: 'relative', width: CATCHY_SIZE.w * Z, height: CATCHY_SIZE.h * Z, overflow: 'hidden', background: checker ? 'repeating-conic-gradient(#e8e8e8 0 25%, #fff 0 50%) 0 0/16px 16px' : '#dfe3ec' }}>{children}</div>
      <figcaption style={{ marginTop: 6 }}>{label}</figcaption>
    </figure>
  );
  const ref = <img src={REFERENCE} alt="" style={{ position: 'absolute', left: -AT.x * Z, top: -AT.y * Z, width: REF.w * Z, height: REF.h * Z, maxWidth: 'none' }} />;
  const cut = (o = 1) => <img src={CATCHY_URI} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: o }} />;
  return (
    <main style={{ padding: 16, fontFamily: 'sans-serif', background: '#fff', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 18 }}>CATCHY compare (dev only)</h1>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {frame(ref, 'REFERENCE')}
        {frame(cut(), 'CANONICAL CATCHY', true)}
        {frame(
          <>
            {ref}
            {cut(opacity)}
          </>,
          `OVERLAY ${Math.round(opacity * 100)}%`,
        )}
      </div>
      <p>
        {[0, 0.5, 1].map((o) => (
          <button key={o} type="button" onClick={() => setOpacity(o)} style={{ marginRight: 6 }}>
            canonical {o * 100}%
          </button>
        ))}
        <input type="range" min={0} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} aria-label="Overlay opacity" />
      </p>
      <div style={{ display: 'flex', gap: 18, alignItems: 'flex-end', padding: 12, background: '#2f6fc8' }}>
        {[20, 32, 48, 64, 96, 128, 256].map((s) => (
          <img key={s} src={CATCHY_URI} width={s} alt={`${s}px`} />
        ))}
      </div>
    </main>
  );
}
