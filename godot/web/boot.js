'use strict';
const canvas = document.getElementById('canvas');
const config = JSON.parse(document.getElementById('godot-config').textContent);
const loading = document.getElementById('loading');
const status = document.getElementById('status');
const retry = document.getElementById('retry');
const controls = document.getElementById('controls');
if (location.port === '4180' && ['localhost', '127.0.0.1'].includes(location.hostname)) {
  document.getElementById('versions-link').href = 'http://localhost:3000/';
}
function failure(error) {
  status.textContent = 'THE FACTORY COULD NOT START';
  document.getElementById('error').textContent = String(error?.message || error);
  loading.style.display = 'grid';
  retry.style.display = 'inline-block';
  console.error(error);
}
retry.addEventListener('click', () => location.reload());
document.getElementById('help-button').addEventListener('click', () => controls.showModal());
document.getElementById('close-help').addEventListener('click', () => controls.close());
controls.addEventListener('close', () => canvas.focus());
if (typeof Engine === 'undefined') {
  failure('The engine download failed. Check your connection, then try again.');
} else {
  const missing = Engine.getMissingFeatures({ threads: false });
  if (missing.length) {
    failure('This game needs WebGL 2 and WebAssembly. Try a current Chrome, Edge, or Firefox browser with graphics acceleration enabled.\n' + missing.join('\n'));
  } else {
    const engine = new Engine(config);
    engine.startGame({ canvas, onProgress(current, total) {
      if (total > 0) {
        document.getElementById('bar').style.width = `${current / total * 100}%`;
        status.textContent = current < total ? `DELIVERING THE MACHINERY · ${Math.round(current / total * 100)}%` : 'WARMING UP THE FABRICATION FLOOR';
      }
    } }).then(() => { loading.remove(); canvas.focus(); }, failure);
  }
}
