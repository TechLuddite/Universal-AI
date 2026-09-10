// The chooser starts neither game. Its only script keeps the existing
// same-origin app-shell service worker up to date after the root-page move.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(new URL('./sw.js', window.location.href)).catch(() => {});
  });
}

// The standalone Godot development server uses a different port.
if (import.meta.env.DEV) {
  const factoryLink = document.querySelector<HTMLAnchorElement>('[data-factory-link]');
  if (factoryLink) factoryLink.href = 'http://localhost:4180/';
}
