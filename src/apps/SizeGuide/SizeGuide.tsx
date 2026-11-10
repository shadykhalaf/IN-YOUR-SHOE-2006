import { SizeChartView } from '../../components/product/SizeGuide';
import { Window } from '../../components/os/Window';
import { FEATURES } from '../../config/features';
import { concept } from '../../data/copy';
import { ESSENTIALS } from '../../data/essentials';
import { useOS, type Win } from '../../state/os';

const CONTACT_URL = ESSENTIALS.find((e) => e.id === 'contact')?.url ?? 'https://inyourshoe.com/pages/contact-us';

/** SIZE GUIDE window: the product's official IYS chart, beside the product page. */
export default function SizeGuide({ win }: { win: Win }) {
  const handle = String(win.props.handle ?? '');
  const title = String(win.props.title ?? '');
  const sourceUrl = String(win.props.sourceUrl ?? 'https://inyourshoe.com/');
  return (
    <Window win={win} icon="ruler">
      <div className="sizeguide-win">
        <h2>{title}</h2>
        {handle ? (
          <SizeChartView
            key={handle}
            handle={handle}
            title={title}
            sourceUrl={sourceUrl}
            ask={
              FEATURES.iysMail
                ? { label: concept.sizeGuide.ask, run: () => useOS.getState().open('mail', { props: { topic: 'Product question', subject: `Sizing: ${title}` } }) }
                : { label: concept.sizeGuide.askMobile, href: CONTACT_URL } // IYS MAIL is hidden for now: IYS's own contact page, as on mobile
            }
          />
        ) : null}
      </div>
    </Window>
  );
}
