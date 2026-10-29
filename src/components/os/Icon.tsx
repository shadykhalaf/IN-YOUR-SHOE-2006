/**
 * IYS OS icon family — original SVG, drawn on a 32px grid (16px variants are
 * the same drawings scaled) with hard 1px outlines and flat period shading.
 * Nothing here is traced from any operating system's icon set.
 */
import type { JSX } from 'react';

const O = '#1b2b44'; // outline
const C = '#ff6060'; // IYS coral
const B = '#06478e'; // IYS blue
const B2 = '#4b87c8';

const shapes: Record<string, JSX.Element> = {
  internet: (
    <>
      <circle cx="16" cy="16" r="11.5" fill={B2} stroke={O} />
      <path d="M16 4.5v23M4.5 16h23M7 10h18M7 22h18" stroke="#dff0ff" strokeWidth="1" fill="none" />
      <ellipse cx="16" cy="16" rx="5.2" ry="11.5" stroke="#dff0ff" fill="none" />
      <path d="M8 8.5a11 11 0 0 1 7-3.6" stroke="#fff" strokeWidth="2" fill="none" opacity=".7" />
      <ellipse cx="16" cy="17" rx="15" ry="5" fill="none" stroke={C} strokeWidth="2.4" transform="rotate(-18 16 17)" />
      <ellipse cx="16" cy="17" rx="15" ry="5" fill="none" stroke="#7a1515" strokeWidth=".6" transform="rotate(-18 16 17)" opacity=".5" />
    </>
  ),
  computer: (
    <g shapeRendering="crispEdges">
      <rect x="3.5" y="3.5" width="25" height="19" fill="#d9d6ce" stroke={O} />
      <rect x="6.5" y="6.5" width="19" height="13" fill={B} stroke="#0d2442" />
      <rect x="8" y="8" width="7" height="2" fill="#7fb2ea" />
      <rect x="21" y="16" width="3" height="2" fill={C} />
      <rect x="11.5" y="22.5" width="9" height="3" fill="#bdb9ae" stroke={O} />
      <rect x="6.5" y="25.5" width="19" height="3" fill="#d9d6ce" stroke={O} />
      <rect x="23" y="20" width="2" height="1" fill="#2fbf4a" />
    </g>
  ),
  hanger: (
    <>
      <path d="M16 9.5c0-2.6 3.6-2.6 3.6 0 0 1.6-3.6 2-3.6 4" fill="none" stroke={O} strokeWidth="1.6" />
      <path d="M16 13.5 3.5 22.5h25z" fill="#f1eee6" stroke={O} strokeLinejoin="round" />
      <path d="M6 22.5h20" stroke="#bdb9ae" />
      <rect x="19.5" y="16.5" width="9" height="12" rx="1" fill={C} stroke={O} transform="rotate(12 24 22)" />
      <circle cx="22" cy="19" r="1.2" fill="#fff" transform="rotate(12 24 22)" />
      <path d="M21 23h5M21 25.5h4" stroke="#fff" transform="rotate(12 24 22)" />
    </>
  ),
  pjoys: (
    <g>
      <path d="M8.5 5.5h15l2.5 22h-6.5L16 13.5l-3.5 14H6z" fill="#fff" stroke={O} strokeLinejoin="round" />
      <path d="M9 9h14.4M8.5 13h6.8M17.8 13h6.1M8 17h5.6M19 17h5.4M7.5 21h5.1M20 21h4.8M7 25h4.8M20.3 25h5" stroke={C} strokeWidth="2" />
      <rect x="8.5" y="5.5" width="15" height="3" fill={B} stroke={O} />
      <path d="M15 8.5v3M17 8.5v3.5" stroke="#fff" strokeWidth="1" />
    </g>
  ),
  folder: (
    <g shapeRendering="crispEdges">
      <path d="M2.5 7.5h10l2 2.5h14.5v17h-26.5z" fill="#e9b949" stroke={O} />
      <path d="M2.5 12.5h27v14.5h-27z" fill="#ffd66e" stroke={O} />
      <path d="M3.5 13.5h25" stroke="#fff3c4" />
    </g>
  ),
  'folder-open': (
    <g shapeRendering="crispEdges">
      <path d="M2.5 7.5h10l2 2.5h13v4h-25z" fill="#e9b949" stroke={O} />
      <path d="M2.5 26.5l4-12h24l-4 12z" fill="#ffd66e" stroke={O} strokeLinejoin="round" />
    </g>
  ),
  wardrobe: (
    <g>
      <g shapeRendering="crispEdges">
        <path d="M2.5 7.5h10l2 2.5h14.5v17h-26.5z" fill="#e9b949" stroke={O} />
        <path d="M2.5 12.5h27v14.5h-27z" fill="#ffd66e" stroke={O} />
      </g>
      <path d="M16 13.2c0-1.8 2.6-1.8 2.6 0 0 1.1-2.6 1.4-2.6 2.8M16 15.9 8.5 22h15z" fill="#fff" stroke={B} strokeWidth="1.3" strokeLinejoin="round" />
    </g>
  ),
  messenger: (
    <>
      <path d="M3.5 5.5h17a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-9l-5 4v-4h-3a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z" fill={B2} stroke={O} />
      <path d="M13.5 13.5h13a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-2v4l-5-4h-6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z" fill={C} stroke={O} />
      <circle cx="17" cy="19" r="1.3" fill="#fff" />
      <circle cx="20.5" cy="19" r="1.3" fill="#fff" />
      <circle cx="24" cy="19" r="1.3" fill="#fff" />
      <path d="M5 8h9" stroke="#fff" opacity=".7" />
    </>
  ),
  camera: (
    <g>
      <rect x="2.5" y="9.5" width="27" height="17" rx="2" fill="#c9ced6" stroke={O} />
      <rect x="4.5" y="6.5" width="7" height="3" fill="#9aa1ab" stroke={O} shapeRendering="crispEdges" />
      <rect x="21.5" y="11.5" width="5" height="3" fill="#fff9d9" stroke={O} shapeRendering="crispEdges" />
      <circle cx="15" cy="18" r="6.5" fill="#3a3f47" stroke={O} />
      <circle cx="15" cy="18" r="4" fill={B} stroke="#0e1b2c" />
      <circle cx="13.6" cy="16.6" r="1.4" fill="#cfe3ff" />
      <rect x="23" y="7" width="4" height="2.5" fill={C} stroke={O} shapeRendering="crispEdges" />
      <path d="M4 11h24" stroke="#fff" opacity=".6" />
    </g>
  ),
  favorites: (
    <path d="M16 3.5l3.7 7.8 8.5 1.1-6.2 5.9 1.6 8.4L16 22.6l-7.6 4.1 1.6-8.4-6.2-5.9 8.5-1.1z" fill="#ffcf3a" stroke={O} strokeLinejoin="round" />
  ),
  stores: (
    <g shapeRendering="crispEdges">
      <rect x="4.5" y="13.5" width="23" height="14" fill="#f1eee6" stroke={O} />
      <path d="M3.5 7.5h25l1 6h-27z" fill="#fff" stroke={O} />
      <path d="M5 8h4v5H4zM13 8h4v5h-4zM21 8h4v5h-4z" fill={C} />
      <rect x="7.5" y="17.5" width="7" height="10" fill={B2} stroke={O} />
      <rect x="17.5" y="17.5" width="7" height="6" fill="#cfe3ff" stroke={O} />
      <rect x="12" y="22" width="1" height="2" fill={O} />
      <rect x="4.5" y="4.5" width="23" height="3" fill={B} stroke={O} />
    </g>
  ),
  bag: (
    <g>
      <path d="M11 11V8.5a5 5 0 0 1 10 0V11" fill="none" stroke={O} strokeWidth="2.2" />
      <path d="M11 11V8.5a5 5 0 0 1 10 0V11" fill="none" stroke={C} strokeWidth="1" />
      <path d="M5.5 10.5h21l1.5 17h-24z" fill={B} stroke={O} strokeLinejoin="round" />
      <path d="M7 12h18" stroke="#4b87c8" />
      <circle cx="11" cy="13.5" r="1.2" fill="#fff" />
      <circle cx="21" cy="13.5" r="1.2" fill="#fff" />
      <text x="16" y="23.5" textAnchor="middle" fontFamily="Tahoma, Verdana, sans-serif" fontWeight="bold" fontSize="6.5" fill="#fff">IYS</text>
    </g>
  ),
  control: (
    <g shapeRendering="crispEdges">
      <rect x="3.5" y="4.5" width="25" height="23" fill="#e7e5df" stroke={O} />
      <rect x="3.5" y="4.5" width="25" height="4" fill={B} stroke={O} />
      <path d="M9 11v14M16 11v14M23 11v14" stroke="#5f5c55" />
      <rect x="6.5" y="13.5" width="5" height="3" fill={C} stroke={O} />
      <rect x="13.5" y="19.5" width="5" height="3" fill={B2} stroke={O} />
      <rect x="20.5" y="15.5" width="5" height="3" fill="#2fbf4a" stroke={O} />
    </g>
  ),
  mail: (
    <g shapeRendering="crispEdges">
      <rect x="2.5" y="7.5" width="27" height="18" fill="#fff" stroke={O} />
      <path d="M3 8l13 10 13-10" fill="none" stroke={O} shapeRendering="auto" />
      <path d="M3 25l10-8M29 25l-10-8" fill="none" stroke="#9aa1ab" shapeRendering="auto" />
      <rect x="22.5" y="9.5" width="5" height="5" fill={C} stroke={O} />
    </g>
  ),
  txt: (
    <g shapeRendering="crispEdges">
      <path d="M6.5 3.5h14l5 5v20h-19z" fill="#fff" stroke={O} />
      <path d="M20.5 3.5v5h5" fill="#dcdad2" stroke={O} />
      <path d="M9 12h13M9 15h13M9 18h13M9 21h9M9 24h11" stroke="#6f8fb8" />
    </g>
  ),
  recycle: (
    <g>
      <path d="M7.5 9.5h17l-2 18h-13z" fill="#dfe6ee" stroke={O} strokeLinejoin="round" />
      <path d="M10 12l1.2 13M13.5 12l.5 13M17 12v13M20.5 12l-.5 13M24 12l-1.3 13M9 15.5h15M9.5 19.5h14M10 23.5h13" stroke="#8b99ab" strokeWidth=".8" />
      <rect x="6.5" y="7.5" width="19" height="3" rx="1" fill="#c3ccd8" stroke={O} />
    </g>
  ),
  exe: (
    <g shapeRendering="crispEdges">
      <rect x="3.5" y="5.5" width="25" height="21" fill="#fff" stroke={O} />
      <rect x="3.5" y="5.5" width="25" height="5" fill={B} stroke={O} />
      <rect x="23" y="7" width="3" height="2" fill={C} />
      <rect x="7" y="14" width="8" height="8" fill={C} />
      <path d="M18 14h7M18 17h7M18 20h5" stroke="#6f8fb8" />
    </g>
  ),
  image: (
    <g shapeRendering="crispEdges">
      <rect x="3.5" y="5.5" width="25" height="21" fill="#fff" stroke={O} />
      <rect x="5.5" y="7.5" width="21" height="17" fill="#9fd0ff" />
      <path d="M5.5 24.5l7-8 5 5 3-3 6 6z" fill="#3f9b4f" shapeRendering="auto" />
      <circle cx="22" cy="12" r="2.5" fill="#ffd43b" />
    </g>
  ),
  cd: (
    <g>
      <circle cx="16" cy="16" r="12.5" fill="#e4e8ee" stroke={O} />
      <path d="M16 3.5a12.5 12.5 0 0 1 11 6.5L16 16z" fill="#c9e7ff" />
      <path d="M27 10a12.5 12.5 0 0 1 1.3 8L16 16z" fill="#ffd9f0" />
      <path d="M4.2 20a12.5 12.5 0 0 1-.5-7L16 16z" fill="#fff4c4" />
      <circle cx="16" cy="16" r="4" fill="#fff" stroke={O} />
      <circle cx="16" cy="16" r="1.5" fill="#a7a49b" />
    </g>
  ),
  search: (
    <g>
      <circle cx="13" cy="13" r="8" fill="#e6f2ff" stroke={O} strokeWidth="1.5" />
      <path d="M10 9.5a4.5 4.5 0 0 1 4-1.5" stroke="#fff" strokeWidth="2" fill="none" />
      <path d="M19 19l8.5 8.5" stroke={O} strokeWidth="4.5" strokeLinecap="round" />
      <path d="M19 19l8.5 8.5" stroke={C} strokeWidth="2.5" strokeLinecap="round" />
    </g>
  ),
  back: (
    <g>
      <rect x="2.5" y="2.5" width="27" height="27" rx="4" fill={B2} stroke={O} />
      <path d="M4 5h24" stroke="#cfe3ff" strokeWidth="2" opacity=".7" />
      <path d="M18 8l-8 8 8 8v-5h7v-6h-7z" fill="#fff" stroke={O} strokeLinejoin="round" />
    </g>
  ),
  forward: (
    <g>
      <rect x="2.5" y="2.5" width="27" height="27" rx="4" fill={B2} stroke={O} />
      <path d="M4 5h24" stroke="#cfe3ff" strokeWidth="2" opacity=".7" />
      <path d="M14 8l8 8-8 8v-5H7v-6h7z" fill="#fff" stroke={O} strokeLinejoin="round" />
    </g>
  ),
  refresh: (
    <g fill="none">
      <path d="M24.5 12A9.5 9.5 0 1 0 25 20" stroke={O} strokeWidth="4.5" />
      <path d="M24.5 12A9.5 9.5 0 1 0 25 20" stroke="#2fbf4a" strokeWidth="2.5" />
      <path d="M27.5 5.5v8h-8z" fill="#2fbf4a" stroke={O} strokeLinejoin="round" />
    </g>
  ),
  home: (
    <g>
      <path d="M16 4.5l12 10h-3.5v12.5h-17V14.5H4z" fill="#f1eee6" stroke={O} strokeLinejoin="round" />
      <path d="M16 4.5l12 10H4z" fill={C} stroke={O} strokeLinejoin="round" />
      <rect x="13.5" y="18.5" width="5" height="8.5" fill={B} stroke={O} shapeRendering="crispEdges" />
    </g>
  ),
  stop: (
    <g>
      <path d="M11 3.5h10l7.5 7.5v10L21 28.5H11L3.5 21V11z" fill="#d8373a" stroke={O} />
      <path d="M11.5 11.5l9 9M20.5 11.5l-9 9" stroke="#fff" strokeWidth="3" />
    </g>
  ),
  error: (
    <g>
      <circle cx="16" cy="16" r="12.5" fill="#e0292c" stroke={O} />
      <path d="M8 10a10 10 0 0 1 8-4" stroke="#ff9d9d" strokeWidth="2" fill="none" />
      <path d="M11 11l10 10M21 11l-10 10" stroke="#fff" strokeWidth="3.2" />
    </g>
  ),
  info: (
    <g>
      <circle cx="16" cy="16" r="12.5" fill={B2} stroke={O} />
      <rect x="14.5" y="13" width="3" height="10" fill="#fff" />
      <rect x="14.5" y="8" width="3" height="3" fill="#fff" />
    </g>
  ),
  warning: (
    <g>
      <path d="M16 3.5l13 24h-26z" fill="#ffcf3a" stroke={O} strokeLinejoin="round" />
      <rect x="14.5" y="11" width="3" height="9" fill={O} />
      <rect x="14.5" y="22" width="3" height="3" fill={O} />
    </g>
  ),
  speaker: (
    <g>
      <path d="M4.5 12.5h5l7-6v19l-7-6h-5z" fill="#e7e5df" stroke={O} strokeLinejoin="round" />
      <path d="M20 11a7 7 0 0 1 0 10M23 8a11 11 0 0 1 0 16" stroke="currentColor" strokeWidth="2" fill="none" />
    </g>
  ),
  'speaker-off': (
    <g>
      <path d="M4.5 12.5h5l7-6v19l-7-6h-5z" fill="#e7e5df" stroke={O} strokeLinejoin="round" />
      <path d="M20 12l8 8M28 12l-8 8" stroke="#ff6060" strokeWidth="3" />
    </g>
  ),
  network: (
    <g shapeRendering="crispEdges">
      <rect x="2.5" y="6.5" width="15" height="11" fill="#d9d6ce" stroke={O} />
      <rect x="4.5" y="8.5" width="11" height="7" fill={B2} />
      <rect x="14.5" y="14.5" width="15" height="11" fill="#d9d6ce" stroke={O} />
      <rect x="16.5" y="16.5" width="11" height="7" fill={B2} />
      <rect x="6" y="18" width="1" height="10" fill={O} />
      <rect x="6" y="27" width="9" height="1" fill={O} />
    </g>
  ),
  tag: (
    <g>
      <path d="M3.5 13.5l10-10h13v13l-10 10z" fill={C} stroke={O} strokeLinejoin="round" />
      <circle cx="21.5" cy="8.5" r="2" fill="#fff" stroke={O} />
    </g>
  ),
  product: (
    <g shapeRendering="crispEdges">
      <rect x="3.5" y="3.5" width="25" height="25" fill="#fff" stroke={O} />
      <rect x="5.5" y="5.5" width="21" height="16" fill="#e8eef6" />
      <path d="M11 8l3-1.5h4L21 8l3.5 3-2 2-1.5-1v7h-10v-7l-1.5 1-2-2z" fill={C} stroke={O} shapeRendering="auto" strokeLinejoin="round" />
      <path d="M6 24h13M6 26h8" stroke="#6f8fb8" />
    </g>
  ),
  cart: (
    <g>
      <path d="M2.5 6.5h4l3.5 14h15l3-10H8" fill="none" stroke={O} strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 11h18l-2.5 8H11z" fill={C} />
      <circle cx="12" cy="25.5" r="2.5" fill="#fff" stroke={O} />
      <circle cx="23" cy="25.5" r="2.5" fill="#fff" stroke={O} />
    </g>
  ),
  help: (
    <g>
      <circle cx="16" cy="16" r="12.5" fill={B} stroke={O} />
      <path d="M12 12.5a4 4 0 1 1 5.5 3.7c-1 .5-1.5 1.2-1.5 2.3v1" fill="none" stroke="#fff" strokeWidth="2.6" />
      <rect x="14.5" y="21.5" width="3" height="3" fill="#fff" />
    </g>
  ),
  zoom: (
    <g>
      <circle cx="13" cy="13" r="8" fill="#e6f2ff" stroke={O} strokeWidth="1.5" />
      <path d="M9 13h8M13 9v8" stroke={B} strokeWidth="2" />
      <path d="M19 19l8.5 8.5" stroke={O} strokeWidth="4" strokeLinecap="round" />
    </g>
  ),
  wallpaper: (
    <g shapeRendering="crispEdges">
      <rect x="2.5" y="4.5" width="27" height="19" fill="#d9d6ce" stroke={O} />
      <rect x="4.5" y="6.5" width="23" height="15" fill={B2} />
      <path d="M4.5 21.5l7-7 5 5 3-3 7 5z" fill={C} shapeRendering="auto" />
      <rect x="12.5" y="23.5" width="7" height="4" fill="#bdb9ae" stroke={O} />
    </g>
  ),
  status: (
    <circle cx="16" cy="16" r="9" fill="currentColor" stroke={O} strokeWidth="2" />
  ),
  shutdown: (
    <g>
      <circle cx="16" cy="16" r="12.5" fill={C} stroke={O} />
      <path d="M11 10.5a7.5 7.5 0 1 0 10 0" stroke="#fff" strokeWidth="2.8" fill="none" />
      <path d="M16 7v9" stroke="#fff" strokeWidth="2.8" />
    </g>
  ),
  external: (
    <g shapeRendering="crispEdges">
      <rect x="4.5" y="8.5" width="19" height="19" fill="#fff" stroke={O} />
      <path d="M17 4.5h10.5V15l-4-4-8 8-3-3 8-8z" fill={B} stroke={O} shapeRendering="auto" strokeLinejoin="round" />
    </g>
  ),
  /** Folded newsletter flyer with a coral "10%" sticker. */
  newsletter: (
    <g>
      <g shapeRendering="crispEdges">
        <rect x="3.5" y="5.5" width="20" height="23" fill="#fff" stroke={O} />
        <rect x="5.5" y="7.5" width="16" height="4" fill={B} />
        <path d="M5.5 14h16M5.5 16.5h16M5.5 19h11M5.5 21.5h13M5.5 24h9" stroke="#8fa9cc" />
      </g>
      <circle cx="23.5" cy="22" r="7" fill={C} stroke={O} />
      <path d="M20.5 20.5h1M20.5 23.5h1M22.5 19.5v5M24 19.5l3 5M24.3 20.2h.1M26.7 23.8h.1" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" />
    </g>
  ),
  /** Box with two arrows going round — exchanges & refunds. */
  exchange: (
    <g>
      <g shapeRendering="crispEdges">
        <rect x="6.5" y="12.5" width="19" height="15" fill="#e9c27a" stroke={O} />
        <path d="M6.5 12.5l3-4h13l3 4" fill="#f5d89c" stroke={O} />
        <rect x="14" y="12.5" width="4" height="15" fill="#d9a955" />
      </g>
      <path d="M4 10.5a9 9 0 0 1 15-6" fill="none" stroke={B} strokeWidth="2.4" />
      <path d="M17.5 1.5l3 3.5-4 1.5z" fill={B} />
      <path d="M28 21a9 9 0 0 1-4.5 7.5" fill="none" stroke={C} strokeWidth="2.4" />
      <path d="M21 26.5l2.5 3.5 2.3-4z" fill={C} />
    </g>
  ),
  /** IYS GAMES: a Y2K joystick with a coral ball and a little sock flag. */
  games: (
    <g>
      <path d="M4.5 21.5h23l-2 6h-19z" fill="#d9d6ce" stroke={O} strokeLinejoin="round" />
      <rect x="4.5" y="18.5" width="23" height="4" rx="1.5" fill={B} stroke={O} />
      <rect x="15" y="10" width="2.4" height="9" fill="#8b99ab" stroke={O} strokeWidth=".8" />
      <circle cx="16.2" cy="8.5" r="4.5" fill={C} stroke={O} />
      <circle cx="14.8" cy="7.2" r="1.3" fill="#fff" opacity=".8" />
      <circle cx="23.5" cy="20.5" r="1.6" fill="#f4c430" stroke={O} strokeWidth=".6" />
      <circle cx="8.5" cy="20.5" r="1.6" fill="#2fbf4a" stroke={O} strokeWidth=".6" />
      <path d="M22 4.5h3v4h1.5l-.5 1.5h-4z" fill="#4aab9a" stroke={O} strokeWidth=".6" />
    </g>
  ),
  /** Tape-measure ruler (SIZE GUIDE). */
  ruler: (
    <g shapeRendering="crispEdges">
      <rect x="2.5" y="11.5" width="27" height="10" fill="#ffd66e" stroke={O} />
      <rect x="3.5" y="12.5" width="25" height="2" fill="#fff3bf" />
      <path d="M6 12v4M10 12v2.5M14 12v4M18 12v2.5M22 12v4M26 12v2.5" stroke={O} />
      <rect x="11" y="17" width="10" height="3" fill={C} />
    </g>
  ),
  /** Small kids tee with a star. */
  kids: (
    <g>
      <path d="M10.5 6.5l-7 4 3 5 3-1.5v12h13v-12l3 1.5 3-5-7-4c-.5 2-2.5 3-4.5 3s-4-1-4.5-3z" fill="#7fc3ff" stroke={O} strokeLinejoin="round" />
      <path d="M16 13.5l1.3 2.7 3 .4-2.2 2.1.5 3-2.6-1.4-2.6 1.4.5-3-2.2-2.1 3-.4z" fill="#ffd66e" stroke={O} strokeWidth=".8" strokeLinejoin="round" />
      <path d="M11 6.5c.7 1.6 2.6 2.5 5 2.5s4.3-.9 5-2.5" fill="none" stroke={C} strokeWidth="1.4" />
    </g>
  ),
};

export type IconName = keyof typeof shapes;
export const iconNames = Object.keys(shapes);

export function Icon({ name, size = 32, title, className }: { name: IconName | string; size?: 16 | 20 | 24 | 32 | 40 | 48 | number; title?: string; className?: string }) {
  const shape = shapes[name] ?? shapes.exe;
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      aria-label={title}
      focusable="false"
    >
      {shape}
    </svg>
  );
}
