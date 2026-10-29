import { useState } from 'react';
import { Window } from '../../components/os/Window';
import type { Win } from '../../state/os';
import { BuddyList, useBuddies, type MyStatus } from './BuddyList';
import { Chat, type ChatInfo } from './Chat';
import { useMessengerMenus } from './menus';

/**
 * IYS MESSENGER: one OS window. The buddy list and a conversation are two
 * views of it (`win.props.buddy`), switched in place: same window, taskbar
 * button and menus; no second Conversation window.
 */
export default function Messenger({ win }: { win: Win }) {
  const buddyId = typeof win.props.buddy === 'string' && win.props.buddy ? win.props.buddy : null;
  const [me, setMe] = useState<MyStatus>('online');
  const [chat, setChat] = useState<ChatInfo>({ status: '', shared: null });
  const buddies = useBuddies();
  const menus = useMessengerMenus(win, buddyId, buddyId ? chat.shared : null);
  return (
    <Window
      win={win}
      icon="messenger"
      menus={menus}
      statusbar={
        buddyId ? (
          <div className="statusbar">
            <span className="grow">{chat.status}</span>
          </div>
        ) : (
          <div className="statusbar">
            <span className="grow">{buddies.length} contacts</span>
            <span>IYS MESSENGER</span>
          </div>
        )
      }
    >
      {buddyId ? <Chat key={buddyId} buddyId={buddyId} onInfo={setChat} /> : <BuddyList me={me} setMe={setMe} />}
    </Window>
  );
}
