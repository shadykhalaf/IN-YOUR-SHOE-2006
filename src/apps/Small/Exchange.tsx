import { ODOO_EXCHANGE_REFUND_FORM_URL } from '../../config/integrations';
import { concept } from '../../data/copy';
import type { Win } from '../../state/os';
import { essential } from '../../data/essentials';
import { useOS } from '../../state/os';
import { OdooForm } from './OdooForm';

/** XCHANGE.EXE :) — Exchanges / Refunds Odoo form (ODOO_EXCHANGE_REFUND_FORM_URL). */
export default function Exchange({ win }: { win: Win }) {
  // Hierarchy: the (future) Odoo FORM first, then the official POLICY, then IYS MAIL.
  return (
    <OdooForm
      win={win}
      icon="exchange"
      url={ODOO_EXCHANGE_REFUND_FORM_URL}
      copy={concept.exchange}
      secondary={
        <>
          <a className="btn" href={essential('exchange-refund').url} target="_blank" rel="noopener noreferrer">
            READ EXCHANGE & REFUND POLICY ↗
          </a>
          <button type="button" className="btn" onClick={() => useOS.getState().open('mail')}>
            CONTACT IYS MAIL
          </button>
        </>
      }
    />
  );
}
