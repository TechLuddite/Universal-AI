import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';

function commitSha(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

/**
 * The production CSP blocks inline scripts and the dev server's HMR WebSocket
 * along with them. Rather than ship a weaker policy, relax it only while
 * serving locally, so what gets deployed is byte-for-byte what was written.
 */
function devCspRelax(): Plugin {
  return {
    name: 'dev-csp-relax',
    apply: 'serve',
    transformIndexHtml(html) {
      return html.replace(
        /<meta http-equiv="Content-Security-Policy"[\s\S]*?\/>/,
        '<!-- CSP relaxed in dev for HMR; the production policy is in index.html -->'
      );
    },
  };
}

/**
 * Offline support. An idle game is precisely the case where it matters.
 *
 * Precaches the app shell only. WebLLM manages its own multi-hundred-megabyte
 * weight cache in Cache Storage, and a service worker competing with it over
 * those files would be a disaster — so model hosts are explicitly skipped.
 */
function serviceWorker(): Plugin {
  return {
    name: 'service-worker',
    apply: 'build',
    closeBundle() {
      const outDir = path.resolve(__dirname, 'dist');
      const manifest = JSON.parse(
        readFileSync(path.join(outDir, '.vite/manifest.json'), 'utf8')
      ) as Record<string, { file: string; css?: string[]; isEntry?: boolean }>;

      // Static entry chunks only. The WebLLM runtime is a dynamic import and
      // its worker is 6MB each — precaching either would force every visitor to
      // download the model runtime they explicitly opted out of.
      const shell = new Set<string>(['./', './index.html', './manifest.webmanifest', './icon.svg']);
      for (const entry of Object.values(manifest)) {
        if (!entry.isEntry) continue;
        if (entry.file) shell.add('./' + entry.file);
        for (const css of entry.css ?? []) shell.add('./' + css);
      }

      const sw = `// Generated at build time. Precaches the app shell for offline play.
const CACHE = 'universal-ai-${commitSha()}';
const SHELL = ${JSON.stringify([...shell], null, 2)};

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never touch model weights — WebLLM owns that cache.
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((hit) => hit || fetch(event.request))
  );
});
`;
      writeFileSync(path.join(outDir, 'sw.js'), sw);
    },
  };
}

export default defineConfig({
  // Relative, so the build works from a custom domain root or a project path.
  base: './',
  plugins: [react(), tailwindcss(), devCspRelax(), serviceWorker()],
  define: {
    __COMMIT_SHA__: JSON.stringify(commitSha()),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
  build: {
    manifest: true,
    // Required under `script-src 'self'` — the polyfill injects inline script.
    modulePreload: { polyfill: false },
    chunkSizeWarningLimit: 7000,
  },
});
