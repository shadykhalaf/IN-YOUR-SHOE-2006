import { FEATURES } from '../../config/features';
import { ODOO_HELP_FORM_URL } from '../../config/integrations';
import { ESSENTIALS } from '../../data/essentials';
import { concept } from '../../data/copy';
import type { Win } from '../../state/os';
import { useOS } from '../../state/os';
import { OdooForm } from './OdooForm';

const CONTACT_URL = ESSENTIALS.find((e) => e.id === 'contact')?.url ?? 'https://inyourshoe.com/pages/contact-us';

/** HELP › IYS Help & Support — Odoo help form (ODOO_HELP_FORM_URL). */
export default function Help({ win }: { win: Win }) {
  return (
    <OdooForm
      win={win}
      icon="help"
      url={ODOO_HELP_FORM_URL}
      copy={concept.help}
      secondary={
        <>
          <button type="button" className="btn" onClick={() => useOS.getState().open('essentials')}>
            VIEW ESSENTIALS
          </button>
          {FEATURES.iysMail ? (
            <button type="button" className="btn" onClick={() => useOS.getState().open('mail')}>
              CONTACT IYS MAIL
            </button>
          ) : (
            // IYS MAIL is hidden for now: IYS's own contact page instead.
            <a className="btn" href={CONTACT_URL} target="_blank" rel="noopener noreferrer">
              CONTACT IYS ↗
            </a>
          )}
        </>
      }
    />
  );
}
