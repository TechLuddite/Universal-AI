import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Offline support. Skipped in dev so HMR isn't served from a stale cache.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    // Resolved against the document URL, not the bundle's — sw.js sits at the
    // site root so its scope covers the whole app.
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // Offline play is a bonus, not a requirement.
    });
  });
}
