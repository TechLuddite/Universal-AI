/**
 * WebLLM inference worker.
 *
 * Token generation runs here so it never blocks the 100ms game tick on the main
 * thread. Vite bundles this as a separate module worker via the
 * `new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })`
 * pattern in webllm.ts.
 */
import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm';

const handler = new WebWorkerMLCEngineHandler();

self.onmessage = (msg: MessageEvent) => {
  handler.onmessage(msg);
};
