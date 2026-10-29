import { ODOO_HELP_FORM_URL } from '../../config/integrations';
import { concept } from '../../data/copy';
import type { Win } from '../../state/os';
import { useOS } from '../../state/os';
import { OdooForm } from './OdooForm';

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
          <button type="button" className="btn" onClick={() => useOS.getState().open('mail')}>
            CONTACT IYS MAIL
          </button>
        </>
      }
    />
  );
}
