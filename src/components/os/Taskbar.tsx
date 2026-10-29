import { useEffect, useRef, useState } from 'react';
import { brand } from '../../data/assets';
import { FEATURES } from '../../config/features';
import { concept } from '../../data/copy';
import { play, unlockAudio } from '../../lib/sound';
import { useCart, itemCount } from '../../state/cart';
import { useOS, type AppId } from '../../state/os';
import { usePreferences } from '../../state/preferences';
import { Icon, type IconName } from './Icon';

export const APP_ICONS: Record<AppId, IconName> = {
  internet: 'internet',
  messenger: 'messenger',
  wardrobe: 'wardrobe',
  camera: 'camera',
  viewer: 'image',
  bag: 'bag',
  control: 'control',
  mail: 'mail',
  readme: 'txt',
  recycle: 'recycle',
  newsletter: 'newsletter',
  help: 'help',
  exchange: 'exchange',
  essentials: 'txt',
  games: 'games',
  game: 'games',
  sizeguide: 'ruler',
};

function Clock() {
  const [now, setNow] = useState(() => new Date());
  const [tip, setTip] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);
  const time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const date = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  return (
    <>
      <button
        type="button"
        className="clock"
        aria-label={`${time}, ${date}. Time machine target: ${concept.targetYear}`}
        aria-expanded={tip}
        onClick={() => setTip((t) => !t)}
        onMouseEnter={() => setTip(true)}
        onMouseLeave={() => setTip(false)}
        onBlur={() => setTip(false)}
      >
        {time}
      </button>
      {tip && (
        <div className="tooltip" role="tooltip" style={{ right: 6, bottom: 'calc(var(--taskbar-h) + 6px)' }}>
          {date} · your real clock
          <br />
          <b>TIME MACHINE TARGET: {concept.targetYear}</b>
        </div>
      )}
    </>
  );
}

export function Taskbar({ onStart, pjoysUnread, onMessenger }: { onStart: () => void; pjoysUnread: boolean; onMessenger: () => void }) {
  const windows = useOS((s) => s.windows);
  const activeId = useOS((s) => s.activeId);
  const startOpen = useOS((s) => s.startOpen);
  const desktopShown = useOS((s) => Boolean(s.desktopShown));
  const notice = useOS((s) => s.notice);
  const { focus, minimize, open } = useOS.getState();
  const sound = usePreferences((s) => s.sound);
  const setSound = usePreferences((s) => s.setSound);
  const bagCount = useCart((s) => itemCount(s.items));
  const online = useOnline();
  const [showNotice, setShowNotice] = useState(false);
  const noticeTimer = useRef<number>(0);

  useEffect(() => {
    if (!notice) return;
    setShowNotice(true);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setShowNotice(false), 3200);
  }, [notice]);

  return (
    <nav className="taskbar" aria-label="Taskbar">
      {FEATURES.topNav ? (
        // MENU lives top left; this corner shows the desktop (and brings the same windows back).
        <button
          type="button"
          className="start start--desktop"
          aria-pressed={desktopShown}
          aria-label={desktopShown ? 'DESKTOP: bring my windows back' : 'DESKTOP: show the desktop'}
          title={desktopShown ? 'Bring my windows back' : 'Show the desktop'}
          onClick={() => {
            play('click');
            useOS.getState().toggleDesktop();
          }}
        >
          <Icon name="computer" size={18} />
          <span>desktop</span>
        </button>
      ) : (
        <button type="button" className="start" aria-haspopup="menu" aria-expanded={startOpen} aria-controls="iys-menu" onClick={onStart}>
          <img src={brand.markWhite} alt="" width={30} height={15} style={{ width: 'auto' }} />
          <span>menu</span>
          <span className="sr-only">IYS menu</span>
        </button>
      )}
      <div className="quicklaunch" role="group" aria-label="Quick launch">
        <button type="button" title="IYS INTERNET" aria-label="Quick launch: IYS Internet" onClick={() => open('internet')}>
          <Icon name="internet" size={20} />
        </button>
        {!FEATURES.topNav && (
          <button type="button" title="Show Desktop" aria-label="Show desktop (minimize all windows)" onClick={() => useOS.getState().toggleDesktop()}>
            <Icon name="computer" size={20} />
          </button>
        )}
        <button type="button" title={`MY BAG (${bagCount})`} aria-label={`Quick launch: My Bag (${bagCount})`} onClick={() => open('bag')}>
          <Icon name="bag" size={20} />
        </button>
      </div>
      <ul className="tasks" aria-label="Open windows">
        {windows.map((w) => {
          const isActive = w.id === activeId && !w.minimized;
          return (
            <li key={w.id} style={{ display: 'contents' }}>
              <button
                type="button"
                className="task"
                aria-pressed={isActive}
                title={w.title}
                onClick={() => {
                  play('click');
                  if (isActive) minimize(w.id);
                  else focus(w.id);
                }}
              >
                <Icon name={APP_ICONS[w.app]} size={16} />
                <span>{w.title}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="tray" role="group" aria-label="Notification area">
        {showNotice && notice && (
          <span className="tray__notice" role="status">
            {notice.text}
          </span>
        )}
        <button type="button" title={pjoysUnread ? '1 NEW MESSAGE' : 'IYS MESSENGER'} aria-label={pjoysUnread ? 'IYS Messenger: 1 new message from PJOYS' : 'Messenger status: no new messages'} onClick={onMessenger} className={pjoysUnread ? 'blink' : undefined}>
          <Icon name="messenger" size={18} />
        </button>
        <button type="button" title={online ? 'IYS INTERNET: Connected' : 'INTERNET CONNECTION LOST'} aria-label={online ? 'Connection: online' : 'Connection: offline'}>
          <Icon name={online ? 'network' : 'error'} size={18} />
        </button>
        <button
          type="button"
          title={sound ? 'Sound: On' : 'Sound: Off'}
          aria-label={sound ? 'Turn sound off' : 'Turn sound on'}
          aria-pressed={sound}
          onClick={() => {
            if (!sound) {
              setSound(true);
              unlockAudio();
              play('click');
            } else setSound(false);
          }}
        >
          <Icon name={sound ? 'speaker' : 'speaker-off'} size={18} />
        </button>
        <Clock />
      </div>
    </nav>
  );
}

export function useOnline() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}
