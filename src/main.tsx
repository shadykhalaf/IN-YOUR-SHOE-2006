import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App';
import './styles/tokens.css';
import './styles/base.css';
import './styles/controls.css';
import './styles/boot.css';

// Service worker: production only, never on /showcase (the renderer must stay
// cache-free) and never during local QA on 127.0.0.1.
if (import.meta.env.PROD && location.pathname !== '/showcase' && location.hostname !== '127.0.0.1' && 'serviceWorker' in navigator) {
  void import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
