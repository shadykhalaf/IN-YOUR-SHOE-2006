import gsap from 'gsap';

/** Film length in seconds (1080×1920, 60 fps when rendered). */
export const DURATION = 19.2;

/**
 * One paused GSAP master timeline. Deterministic: no callbacks, no random
 * values, no real clock — every change is a tween or set, so seek(t) from any
 * position reproduces the same frame (the renderer relies on this).
 */
export function buildTimeline(root: HTMLElement): gsap.core.Timeline {
  const q = gsap.utils.selector(root);
  const one = (id: string) => q(`[data-sc="${id}"]`)[0] as HTMLElement;
  const all = (id: string) => q(`[data-sc="${id}"]`) as HTMLElement[];
  /** Centre of an element in stage coordinates (offsets ignore the preview scale). */
  const centre = (el: HTMLElement) => {
    let x = el.offsetWidth / 2;
    let y = el.offsetHeight / 2;
    let n: HTMLElement | null = el;
    while (n && n !== root) {
      x += n.offsetLeft;
      y += n.offsetTop;
      n = n.offsetParent as HTMLElement | null;
    }
    return { x: x - 3, y: y - 3 };
  };

  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } });
  const WINDOWS = ['portal', 'chat', 'shop', 'product', 'camera', 'viewer', 'wardrobe', 'bag', 'store', 'tile'];
  const cursor = one('cursor');

  // ── initial state (t = 0) ────────────────────────────────────────────
  tl.set(WINDOWS.map(one), { autoAlpha: 0, scale: 0.94, x: 0, y: 0, transformOrigin: '50% 40%' }, 0)
    .set([one('dialog'), one('balloon'), one('xfer'), one('end'), one('power'), one('exe'), one('notice'), one('bagbadge'), one('search'), one('wall2'), one('flash'), one('stamp')], { autoAlpha: 0 }, 0)
    .set([...all('icon'), ...all('task'), ...all('msg'), ...all('att'), ...all('top8'), ...all('res'), ...all('fold'), ...all('cam'), ...all('bootline')], { autoAlpha: 0 }, 0)
    .set(one('wthumbs'), { autoAlpha: 0 }, 0)
    .set(one('boot'), { autoAlpha: 1 }, 0)
    .set(one('bootscreen'), { autoAlpha: 0 }, 0)
    .set(one('boottarget'), { autoAlpha: 0 }, 0)
    .set(one('dot'), { scale: 0, autoAlpha: 1 }, 0)
    .set([one('bootbar'), one('xferbar')], { width: '0%' }, 0)
    .set(one('xferdone'), { autoAlpha: 0 }, 0)
    .set(cursor, { autoAlpha: 0, x: 400, y: 800 }, 0)
    .set(one('taskbar'), { y: 40 }, 0)
    .set(one('wall1'), { scale: 1.08 }, 0)
    .set(one('shopgrid'), { y: 0 }, 0)
    .set(one('odo'), { y: 0 }, 0)
    .set(one('q'), { clipPath: 'inset(0 100% 0 0)' }, 0)
    .set(one('powerline'), { autoAlpha: 0, scaleX: 1 }, 0);

  const open = (id: string, at: number, extra: gsap.TweenVars = {}) => tl.to(one(id), { autoAlpha: 1, scale: 1, duration: 0.16, ...extra }, at);
  const close = (ids: string[], at: number) => tl.to(ids.map(one), { autoAlpha: 0, duration: 0.1, ease: 'none' }, at);
  const move = (el: HTMLElement, at: number, dur = 0.25) => tl.to(cursor, { ...centre(el), duration: dur, ease: 'power2.inOut' }, at);
  const press = (el: HTMLElement, at: number) => tl.to(el, { filter: 'brightness(0.75)', duration: 0.04 }, at).to(el, { filter: 'brightness(1)', duration: 0.06 }, at + 0.08);
  const flash = (at: number) => tl.to(one('flash'), { autoAlpha: 0.9, duration: 0.03, ease: 'none' }, at).to(one('flash'), { autoAlpha: 0, duration: 0.22, ease: 'power1.in' }, at + 0.03);

  // ── 0.00–1.60 boot: CRT pop → POST → current IYS logo ────────────────
  tl.to(one('dot'), { scale: 1, duration: 0.1 }, 0.05)
    .to(one('dot'), { scaleX: 38, scaleY: 0.22, duration: 0.1, ease: 'power3.in' }, 0.16)
    .to(one('dot'), { scaleY: 30, autoAlpha: 0, duration: 0.1 }, 0.27)
    .to(one('bootscreen'), { autoAlpha: 1, duration: 0.05 }, 0.32)
    .to(all('bootline'), { autoAlpha: 1, duration: 0.02, stagger: 0.14 }, 0.45)
    .to(one('boottarget'), { autoAlpha: 1, duration: 0.05 }, 1.05)
    .to(one('bootbar'), { width: '100%', duration: 0.42, ease: 'steps(10)' }, 1.1)
    .to(one('boot'), { autoAlpha: 0, duration: 0.14, ease: 'none' }, 1.58);

  // ── 1.60–2.20 desktop with the real FW27 campaign ────────────────────
  tl.to(one('wall1'), { scale: 1, duration: 0.7 }, 1.58)
    .to(one('taskbar'), { y: 0, duration: 0.18 }, 1.62)
    .to(all('icon'), { autoAlpha: 1, duration: 0.08, stagger: 0.04 }, 1.7)
    .to(one('stamp'), { autoAlpha: 1, duration: 0.15 }, 1.95);

  // ── 2.20–3.50 IYS.EXE → OBVIOUSLY → IYS INTERNET ──────────────────────
  tl.set(one('dialog'), { scale: 0.9 }, 0).to(one('dialog'), { autoAlpha: 1, scale: 1, duration: 0.14 }, 2.2);
  tl.to(cursor, { autoAlpha: 1, duration: 0.05 }, 2.3);
  move(one('obv'), 2.35, 0.5);
  press(one('obv'), 2.92);
  tl.to(one('dialog'), { autoAlpha: 0, duration: 0.08 }, 3.05);
  open('portal', 3.1);
  tl.to(all('task')[0]!, { autoAlpha: 1, duration: 0.05 }, 3.1).to(all('top8'), { autoAlpha: 1, duration: 0.08, stagger: 0.045 }, 3.24);
  tl.to(cursor, { x: 470, y: 640, duration: 0.3, ease: 'power2.inOut' }, 3.2);

  // ── 3.50–6.00 2:13 AM — PJOYS is online ───────────────────────────────
  tl.set(one('balloon'), { y: 12 }, 0)
    .to(one('balloon'), { autoAlpha: 1, y: 0, duration: 0.14 }, 3.52)
    .to(one('balloon'), { autoAlpha: 0, duration: 0.1 }, 3.95);
  open('chat', 3.86);
  tl.set(one('chat'), { x: 30 }, 0).to(one('chat'), { x: 0, duration: 0.16 }, 3.86);
  tl.to(all('task')[1]!, { autoAlpha: 1, duration: 0.05 }, 3.86);
  const msgs = all('msg');
  tl.to([msgs[0]!, msgs[1]!], { autoAlpha: 1, duration: 0.05 }, 4.02)
    .to(msgs[2]!, { autoAlpha: 1, duration: 0.05 }, 4.3)
    .to(msgs[3]!, { autoAlpha: 1, duration: 0.05 }, 4.52);
  all('att').forEach((el, i) => {
    tl.set(el, { y: 10 }, 0).to(el, { autoAlpha: 1, y: 0, duration: 0.12 }, 4.66 + i * 0.17);
  });
  flash(5.02);
  close(['chat', 'portal'], 5.94);

  // ── 6.00–8.30 the whole catalogue, then search CAIRO ─────────────────
  open('shop', 6.0);
  const grid = one('shopgrid');
  const dist = Math.max(0, grid.scrollHeight - (grid.parentElement?.clientHeight ?? 0));
  const odo = one('odo');
  const lineH = (odo.firstElementChild as HTMLElement | null)?.offsetHeight ?? 16;
  const pages = odo.children.length;
  tl.to(grid, { y: -dist, duration: 0.9, ease: 'power1.inOut' }, 6.15).to(odo, { y: -(pages - 1) * lineH, duration: 0.9, ease: `steps(${pages - 1})` }, 6.15);
  tl.to(one('search'), { autoAlpha: 1, duration: 0.08 }, 7.08)
    .to(one('q'), { clipPath: 'inset(0 0% 0 0)', duration: 0.34, ease: 'steps(5)' }, 7.14)
    .to(all('res'), { autoAlpha: 1, duration: 0.06, stagger: 0.08 }, 7.52);
  move(all('res')[0]!, 7.78, 0.26);
  press(all('res')[0]!, 8.08);
  close(['shop'], 8.2);

  // ── 8.30–9.80 size M → ADD TO BAG → COPYING TO MY BAG ─────────────────
  open('product', 8.24);
  move(one('chipM'), 8.34, 0.22);
  tl.set(one('chipM'), { background: '#06478e', color: '#ffffff' }, 8.58);
  move(one('add'), 8.62, 0.24);
  press(one('add'), 8.88);
  tl.set(one('xfer'), { xPercent: -50, yPercent: -50 }, 0)
    .to(one('xfer'), { autoAlpha: 1, duration: 0.06 }, 8.95)
    .to(one('xferbar'), { width: '100%', duration: 0.55, ease: 'steps(12)' }, 9.0)
    .to(one('xferdone'), { autoAlpha: 1, duration: 0.03 }, 9.55)
    .set(one('bagbadge'), { scale: 1.6 }, 0)
    .to(one('bagbadge'), { autoAlpha: 1, scale: 1, duration: 0.18 }, 9.58)
    .to(one('xfer'), { autoAlpha: 0, duration: 0.08 }, 9.74);
  close(['product'], 9.8);

  // ── 9.80–12.00 IYS CAMERA → set as wallpaper ─────────────────────────
  open('camera', 9.86);
  flash(9.84);
  tl.to(all('task')[2]!, { autoAlpha: 1, duration: 0.05 }, 9.86).to(all('cam'), { autoAlpha: 1, duration: 0.05, stagger: 0.04 }, 9.9);
  move(all('cam')[0]!, 10.3, 0.22);
  press(all('cam')[0]!, 10.52);
  open('viewer', 10.6, { duration: 0.18 });
  move(one('setwp'), 10.8, 0.26);
  press(one('setwp'), 11.1);
  tl.to(one('wall2'), { autoAlpha: 1, duration: 0.3, ease: 'none' }, 11.2)
    .to(one('notice'), { autoAlpha: 1, duration: 0.05 }, 11.25);
  close(['viewer', 'camera'], 11.3);
  tl.to(cursor, { x: 420, y: 520, duration: 0.3, ease: 'power2.inOut' }, 11.4).to(one('notice'), { autoAlpha: 0, duration: 0.1 }, 12.0);

  // ── 12.00–14.20 MY WARDROBE — real counts ────────────────────────────
  open('wardrobe', 12.05);
  tl.to(all('task')[3]!, { autoAlpha: 1, duration: 0.05 }, 12.05).to(all('fold'), { autoAlpha: 1, duration: 0.08, stagger: 0.08 }, 12.15);
  const pj = root.querySelector<HTMLElement>('[data-sc="fold"].is-target')!;
  move(pj, 12.66, 0.22);
  tl.set(pj, { background: '#2f6fbf', color: '#ffffff' }, 12.9);
  tl.to(all('fold'), { autoAlpha: 0, duration: 0.08 }, 13.02)
    .to(one('wthumbs'), { autoAlpha: 1, duration: 0.05 }, 13.05)
    .from(one('wthumbs').children, { autoAlpha: 0, y: 8, duration: 0.1, stagger: 0.07, immediateRender: false }, 13.08);
  close(['wardrobe'], 14.12);

  // ── 14.20–16.80 controlled desktop chaos ─────────────────────────────
  const chaos: [string, number, number, number, number][] = [
    ['portal', 14.22, -6, -16, 0.9],
    ['chat', 14.5, 10, -150, 0.82],
    ['viewer', 14.78, 18, 30, 0.72],
    ['store', 15.04, 4, -90, 1],
    ['bag', 15.28, -10, -210, 1],
    ['product', 15.52, 70, 30, 0.62],
    ['tile', 15.78, -20, 420, 1],
    ['camera', 16.02, -10, 250, 0.7],
  ];
  for (const [id, at, x, y, s] of chaos) {
    tl.set(one(id), { x, y, scale: s * 0.94 }, at - 0.01);
    open(id, at, { scale: s });
  }
  flash(15.05);
  tl.to(cursor, { x: 300, y: 700, duration: 0.8, ease: 'power1.inOut' }, 15.2);

  // ── 16.80–17.40 everything minimises → IYS.EXE ───────────────────────
  tl.to(
    chaos.map(([id]) => one(id)),
    { y: '+=760', scale: 0.18, autoAlpha: 0, duration: 0.2, ease: 'power2.in', stagger: 0.04 },
    16.8,
  );
  tl.to(all('icon'), { autoAlpha: 0, duration: 0.1 }, 17.05).to(one('stamp'), { autoAlpha: 0, duration: 0.1 }, 17.05);
  tl.set(one('exe'), { scale: 0.6 }, 0).to(one('exe'), { autoAlpha: 1, scale: 1, duration: 0.18, ease: 'back.out(2)' }, 17.12);

  // ── 17.40–19.20 open IYS.EXE → end card → power off ──────────────────
  move(one('exe'), 17.2, 0.24);
  press(one('exe'), 17.46);
  tl.to(cursor, { autoAlpha: 0, duration: 0.05 }, 17.58);
  tl.set(one('end'), { scale: 0.25 }, 0).to(one('end'), { autoAlpha: 1, scale: 1, duration: 0.22, ease: 'power3.out' }, 17.55);
  tl.from(one('end').children, { autoAlpha: 0, y: 10, duration: 0.14, stagger: 0.1, immediateRender: false }, 17.7);
  tl.to([q('.sc-desk')[0]!, one('taskbar')], { autoAlpha: 0, duration: 0.01 }, 18.8)
    .to(one('end'), { scaleY: 0.006, filter: 'brightness(2.2)', duration: 0.12, ease: 'power4.in' }, 18.86)
    .to(one('end'), { autoAlpha: 0, duration: 0.01 }, 18.98)
    .to(one('power'), { autoAlpha: 1, duration: 0.01 }, 18.98)
    .to(one('powerline'), { autoAlpha: 1, duration: 0.01 }, 18.98)
    .to(one('powerline'), { scaleX: 0.01, duration: 0.1, ease: 'power3.in' }, 18.99)
    .to(one('powerline'), { autoAlpha: 0, duration: 0.06 }, 19.08)
    .to({}, { duration: 0.01 }, DURATION - 0.01);

  return tl;
}
