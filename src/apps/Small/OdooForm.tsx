import type { ReactNode } from 'react';
import { Icon, type IconName } from '../../components/os/Icon';
import { Window } from '../../components/os/Window';
import type { Win } from '../../state/os';

export interface OdooCopy {
  heading: string;
  pending: string;
  placeholder: string;
  open: string;
}

/**
 * A period window that hosts an Odoo form. With no URL configured it shows an
 * intentional placeholder (no fake form). With a URL it embeds the form and
 * always offers an "open" button, in case Odoo refuses to be framed.
 */
export function OdooForm({ win, icon, url, copy, secondary }: { win: Win; icon: IconName; url: string | null; copy: OdooCopy; secondary?: ReactNode }) {
  return (
    <Window
      win={win}
      icon={icon}
      statusbar={
        <div className="statusbar">
          <span className="grow" role="status">
            {url ? 'Connected.' : copy.pending}
          </span>
        </div>
      }
    >
      <div className="odoo">
        <div className="odoo__head">
          <Icon name={icon} size={32} />
          <h3>{copy.heading}</h3>
          {url && (
            <a className="btn btn--go" href={url} target="_blank" rel="noopener noreferrer" data-autofocus>
              {copy.open}
            </a>
          )}
        </div>
        {url ? (
          <iframe className="odoo__frame" src={url} title={copy.heading} referrerPolicy="strict-origin-when-cross-origin" />
        ) : (
          <div className="odoo__placeholder" data-testid="odoo-placeholder">
            <p>
              <b>{copy.pending}</b>
            </p>
            <p className="odoo__slot">{copy.placeholder}</p>
          </div>
        )}
        {secondary && <div className="cp-actions">{secondary}</div>}
      </div>
    </Window>
  );
}
