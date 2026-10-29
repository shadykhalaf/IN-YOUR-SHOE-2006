import { concept, official } from '../../data/copy';
import { useBrowse, productPath } from '../../lib/useBrowse';
import { useOS } from '../../state/os';
import { usePreferences, useSession } from '../../state/preferences';
import { useIconPositions } from '../../state/icons';
import { SystemDialog } from './SystemDialog';
import { switchToRealIYS } from '../../lib/checkout';
import { markEscape } from '../../lib/frustration';
import { itemCount, useCart } from '../../state/cart';

/** The single place system dialogs are rendered (never stacked). */
export function Dialogs() {
  const dialog = useOS((s) => s.dialog);
  const { showDialog, notify, open, closeAll } = useOS.getState();
  const browse = useBrowse();
  const bagCount = useCart((s) => itemCount(s.items));
  if (!dialog) return null;
  const close = () => showDialog(null);

  switch (dialog.kind) {
    case 'welcome':
      return (
        <SystemDialog
          title={concept.dialog.app}
          icon="info"
          onCancel={() => {
            close();
            useSession.getState().markWelcome();
            notify(concept.dialog.postponed);
          }}
          actions={
            <>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  close();
                  useSession.getState().markWelcome();
                  notify(concept.dialog.postponed);
                }}
              >
                {concept.dialog.cancel}
              </button>
              <button
                type="button"
                className="btn btn--primary"
                data-autofocus
                onClick={() => {
                  close();
                  useSession.getState().markWelcome();
                  browse('/');
                }}
              >
                {concept.dialog.ok}
              </button>
            </>
          }
        >
          <p className="dialog__big">{official.coolDecision}</p>
          <p style={{ marginTop: 8, fontSize: 11, color: 'var(--muted)' }}>
            Line from inyourshoe.com. The buttons are concept UI.
          </p>
        </SystemDialog>
      );
    case 'error':
      return (
        <SystemDialog
          title={dialog.title}
          icon="error"
          sound="error"
          onCancel={close}
          actions={
            dialog.action ? (
              <button
                type="button"
                className="btn btn--primary"
                data-autofocus
                onClick={() => {
                  close();
                  browse(productPath(dialog.action!.handle));
                }}
              >
                {dialog.action.label}
              </button>
            ) : (
              <button type="button" className="btn" data-autofocus onClick={close}>
                OK
              </button>
            )
          }
        >
          <p className="dialog__big">{dialog.message}</p>
        </SystemDialog>
      );
    case 'info':
      return (
        <SystemDialog
          title={dialog.title}
          icon="info"
          onCancel={close}
          actions={
            <button type="button" className="btn btn--primary" data-autofocus onClick={close}>
              OK
            </button>
          }
        >
          {dialog.lines.map((l) => (
            <p key={l}>{l}</p>
          ))}
        </SystemDialog>
      );
    case 'escape': {
      const stay = () => {
        close();
        markEscape('dismissed');
        notify(concept.escape.stayed);
      };
      return (
        <SystemDialog
          title={concept.escape.title}
          icon="info"
          onCancel={stay}
          actions={
            <>
              <button type="button" className="btn" data-autofocus onClick={stay}>
                {concept.escape.stay}
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  close();
                  markEscape('accepted');
                  switchToRealIYS();
                }}
              >
                {concept.escape.open}
              </button>
            </>
          }
        >
          <p className="dialog__big">{concept.escape.heading}</p>
          <p>{concept.escape.body}</p>
          {bagCount > 0 && <p>{concept.escape.bag(bagCount)}</p>}
        </SystemDialog>
      );
    }
    case 'confirm-reset':
      return (
        <SystemDialog
          title="RESET DESKTOP"
          icon="warning"
          onCancel={close}
          actions={
            <>
              <button type="button" className="btn" data-autofocus onClick={close}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  close();
                  closeAll();
                  usePreferences.getState().reset();
                  useIconPositions.getState().reset();
                  notify('DESKTOP RESET.');
                  open('control');
                }}
              >
                Reset
              </button>
            </>
          }
        >
          <p>Close every window and restore the default wallpaper and CRT filter?</p>
          <p style={{ marginTop: 6 }}>Your bag and favorites are kept.</p>
        </SystemDialog>
      );
  }
}
