/**
 * ── Standalone Worker Entrypoint ────────────────────────────────────
 *
 * Optional way to run the BullMQ worker as its OWN process, separate from
 * the web server (e.g. a dedicated Railway worker service):
 *
 *   npx tsx src/lib/server/worker.ts
 *
 * In the default single-service deployment the worker is started
 * in-process by `src/instrumentation.ts`, so you do NOT need this.
 */

import { startWorkflowWorker } from "./start-worker";

startWorkflowWorker()
  .then(() => console.log("[Worker] Standalone worker process ready."))
  .catch((err) => {
    console.error("[Worker] Failed to start:", err);
    process.exit(1);
  });

// Keep the process alive.
setInterval(() => {}, 1 << 30);
