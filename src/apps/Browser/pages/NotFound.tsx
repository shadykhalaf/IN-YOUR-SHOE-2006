import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Icon } from '../../../components/os/Icon';
import { concept } from '../../../data/copy';
import { usePage } from '../../../lib/usePage';
import { noteFrustration } from '../../../lib/frustration';

export default function NotFound() {
  const navigate = useNavigate();
  usePage('Page offline', 'Error: page not found.');
  useEffect(() => noteFrustration('not-found', window.location.pathname), []);
  return (
    <div className="page notfound">
      <div className="errbox" role="alert">
        <div className="errbox__title">
          <Icon name="exe" size={16} /> {concept.notFound.title}
        </div>
        <div className="errbox__body">
          <Icon name="error" size={32} />
          <div>
            <h1>{concept.notFound.line}</h1>
            <p>It may have been moved, sold out of the snapshot, or never existed.</p>
            <p className="catchy">{concept.catchy.notFound}</p>
          </div>
        </div>
        <div className="errbox__actions">
          <button type="button" className="btn btn--primary" onClick={() => navigate('/')}>
            HOME
          </button>
          <button type="button" className="btn" onClick={() => navigate('/shop')}>
            {concept.y2k.back2Shop}
          </button>
        </div>
      </div>
    </div>
  );
}
