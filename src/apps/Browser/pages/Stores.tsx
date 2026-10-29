import { Icon } from '../../../components/os/Icon';
import { assets } from '../../../data/assets';
import storesData from '../../../data/stores.generated.json';
import { officialSources } from '../../../data/copy';
import { openViewer } from '../../../lib/actions';
import { usePage } from '../../../lib/usePage';

export const STORES = storesData.stores;

export default function Stores() {
  usePage('Find IYS IRL', `${STORES.length} stores listed.`);
  return (
    <div className="page stores">
      <header className="page__head">
        <h1 className="page__title">
          <Icon name="stores" size={32} /> FIND IYS IRL
        </h1>
        <p className="page__meta">
          {STORES.length} stores, as published on{' '}
          <a href={officialSources.stores} target="_blank" rel="noopener noreferrer">
            inyourshoe.com/pages/store-locations
          </a>{' '}
          ({storesData.generatedAt.slice(0, 10)}). Hours and phone numbers can change - check before you go.
        </p>
      </header>
      <table className="dirtable">
        <caption className="sr-only">In Your Shoe store directory</caption>
        <thead>
          <tr>
            <th scope="col">Photo</th>
            <th scope="col">Store</th>
            <th scope="col">Where to find it</th>
            <th scope="col">Opening hours</th>
            <th scope="col">Phone</th>
          </tr>
        </thead>
        <tbody>
          {STORES.map((s) => {
            const photo = assets.stores.find((x) => x.name === s.name);
            return (
              <tr key={s.name}>
                <td className="dirtable__photo">
                  {photo ? (
                    <button type="button" className="thumbbtn" aria-label={`View photo of ${s.name} store`} onClick={() => openViewer([{ src: photo.src, full: photo.src, title: `IN YOUR SHOE - ${s.name}`, filename: `${s.name.replace(/\W+/g, '_').toUpperCase()}.JPG`, alt: `In Your Shoe store, ${s.name}`, sourceUrl: officialSources.stores, width: photo.width, height: photo.height }])}>
                      <img src={photo.src} alt="" width={96} height={72} loading="lazy" decoding="async" />
                    </button>
                  ) : (
                    '-'
                  )}
                </td>
                <th scope="row">{s.name}</th>
                <td>
                  {s.address}
                  {s.mapsUrl && (
                    <>
                      <br />
                      <a href={s.mapsUrl} target="_blank" rel="noopener noreferrer">
                        Directions ↗
                      </a>
                    </>
                  )}
                </td>
                <td>
                  {s.hours.map((h) => (
                    <span key={h} className="dirtable__line">
                      {h}
                    </span>
                  ))}
                </td>
                <td>{s.phone ? <a href={`tel:${s.phone}`}>{s.phone}</a> : <span className="muted">Not listed</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
