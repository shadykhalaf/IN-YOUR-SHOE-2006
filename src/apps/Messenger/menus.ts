import type { MenuDef } from '../../components/os/MenuBar';
import { concept } from '../../data/copy';
import { BUDDIES } from '../../data/taxonomy';
import { useCatalogue } from '../../lib/catalogue/load';
import type { Product } from '../../lib/catalogue/types';
import { collectionPath, productPath, useBrowse } from '../../lib/useBrowse';
import { useOS, type Win } from '../../state/os';
import { addToBag, quickRequest } from '../../state/status';
import { focusWhenReady, MESSENGER, openChat, showBuddies } from './nav';

export { openChat, showBuddies } from './nav';

/**
 * Real menus for the one IYS MESSENGER window, rendered by the same MenuBar
 * as IYS INTERNET. `buddyId` = the conversation open in the window (null = the
 * buddy list is showing); `shared` = the latest product actually sent in it.
 */
export function useMessengerMenus(win: Win, buddyId: string | null, shared: Product | null = null): MenuDef[] {
  const cat = useCatalogue();
  const browse = useBrowse();
  const { open, close, minimize } = useOS.getState();
  const isChat = Boolean(buddyId);
  const available = BUDDIES.filter((b) => !cat || (cat.collections.get(b.collection)?.count ?? 0) > 0);
  const buddy = buddyId ? available.find((b) => b.id === buddyId) ?? null : null;
  const startConversation = () => {
    open('messenger');
    showBuddies();
    focusWhenReady(`[data-window="${MESSENGER}"] .im__buddy`);
  };
  const sendIM = (id: string, name: string) => openChat(id, name, `#compose-chat-${id}`);
  const req = shared ? quickRequest(shared) : null;

  return [
    {
      label: 'File',
      items: [
        { label: 'New Conversation...', run: startConversation },
        { label: 'Minimize Messenger', run: () => minimize(win.id) },
        // In a conversation, Close Conversation goes back to the buddy list (same window).
        ...(isChat ? [{ label: 'Close Conversation', separator: true, run: showBuddies }] : []),
        { label: 'Close IYS Messenger', separator: !isChat, run: () => close(win.id) },
      ],
    },
    {
      label: 'Contacts',
      items: [
        ...available.map((b) => ({ label: b.name, run: () => openChat(b.id, b.name) })),
        { label: 'Show Buddy List', separator: true, run: showBuddies },
      ],
    },
    {
      label: 'Actions',
      items: buddy
        ? [
            { label: 'Send IM', run: () => sendIM(buddy.id, buddy.name) },
            { label: `Open ${buddy.name} Collection`, run: () => browse(collectionPath(buddy.collection)) },
            ...(shared ? [{ label: 'View Shared Product', run: () => browse(productPath(shared.handle)) }] : []),
            ...(shared && req ? [{ label: 'Add Shared Product to Bag', run: () => addToBag(req) }] : []),
            { label: 'Open My Bag', separator: true, run: () => open('bag') },
            { label: 'Open IYS Internet', run: () => open('internet') },
          ]
        : [
            { label: 'Start Conversation...', run: startConversation },
            { label: 'Open My Bag', run: () => open('bag') },
            { label: 'Open IYS Internet', run: () => open('internet') },
          ],
    },
    {
      label: 'Help',
      items: [
        { label: concept.messenger.howTo.title, run: () => useOS.getState().showDialog({ kind: 'info', title: concept.messenger.howTo.title, lines: [...concept.messenger.howTo.lines] }) },
        { label: concept.messenger.about.title, run: () => useOS.getState().showDialog({ kind: 'info', title: concept.messenger.about.title, lines: [...concept.messenger.about.lines] }) },
      ],
    },
  ];
}
