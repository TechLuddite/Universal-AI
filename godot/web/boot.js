'use strict';
const canvas = document.getElementById('canvas');
const config = JSON.parse(document.getElementById('godot-config').textContent);
const loading = document.getElementById('loading');
const status = document.getElementById('status');
const retry = document.getElementById('retry');
const controls = document.getElementById('controls');
// Preferences do not touch the simulation save or silently raise the GPU budget.
const graphicsKey = 'the-seed-graphics-v1';
let preferences = {};
try { preferences = JSON.parse(localStorage.getItem(graphicsKey) || '{}') || {}; } catch {}
window.seedGraphics = {
  aa: [0, 1, 2].includes(preferences.aa) ? preferences.aa : 0,
  cap: [1280, 1440, 1920].includes(preferences.cap) ? preferences.cap : 1440,
  shadows: typeof preferences.shadows === 'boolean' ? preferences.shadows : true,
  recording: false,
};
const aaControl = document.getElementById('graphics-aa');
const capControl = document.getElementById('graphics-cap');
const shadowControl = document.getElementById('graphics-shadows');
aaControl.value = String(window.seedGraphics.aa);
capControl.value = String(window.seedGraphics.cap);
shadowControl.checked = window.seedGraphics.shadows;
for (const control of [aaControl, capControl, shadowControl]) control.addEventListener('change', () => {
  Object.assign(window.seedGraphics, { aa: Number(aaControl.value), cap: Number(capControl.value), shadows: shadowControl.checked });
  try {
    localStorage.setItem(graphicsKey, JSON.stringify({ aa: window.seedGraphics.aa, cap: window.seedGraphics.cap, shadows: window.seedGraphics.shadows }));
    document.getElementById('graphics-storage').textContent = 'Settings saved.';
  } catch { document.getElementById('graphics-storage').textContent = 'Storage unavailable: settings apply to this session only.'; }
});
const recordButton = document.getElementById('record-performance');
const downloadButton = document.getElementById('download-performance');
const recordingStatus = document.getElementById('performance-status');
let samples = [];
let recordingStarted = null;
function stopRecording() {
  window.seedGraphics.recording = false;
  recordButton.textContent = 'Record 60 seconds';
  downloadButton.disabled = samples.length === 0;
  recordingStatus.textContent = `${samples.length} samples recorded. Report stays on this machine.`;
}
recordButton.addEventListener('click', () => {
  if (window.seedGraphics.recording) { stopRecording(); return; }
  samples = [];
  recordingStarted = new Date().toISOString();
  window.seedGraphics.recording = true;
  recordButton.textContent = 'Stop recording';
  downloadButton.disabled = true;
  recordingStatus.textContent = 'Recording while you play. You can close this panel.';
});
// Called once per measured second by Godot, only during an explicit recording.
window.seedReceivePerformance = sample => {
  if (!window.seedGraphics.recording || samples.length >= 60) return;
  const heap = performance.memory;
  samples.push({ ...sample, js_heap_bytes_approx: heap ? heap.usedJSHeapSize : null });
  recordingStatus.textContent = `${samples.length}/60 samples · ${sample.fps} fps · ${sample.render_width} × ${sample.render_height} · AA ${['off', '2×', '4×'][sample.msaa]}`;
  if (samples.length >= 60) stopRecording();
};
document.addEventListener('visibilitychange', () => {
  // Do not mix background throttling into a foreground comparison.
  if (document.hidden && window.seedGraphics.recording) stopRecording();
});
downloadButton.addEventListener('click', () => {
  const report = { schema: 1, started_at: recordingStarted, browser: navigator.userAgent,
    device_pixel_ratio: devicePixelRatio, screen: { width: screen.width, height: screen.height },
    limitations: 'Frame intervals include the 30 fps limiter. JavaScript heap is approximate and excludes total browser/GPU/system memory. No performance-fix conclusion is implied.', samples };
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url; link.download = 'the-seed-performance.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
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
    } }).then(() => { loading.remove(); canvas.focus(); recordButton.disabled = false; recordingStatus.textContent = 'Ready to record.'; }, failure);
  }
}
