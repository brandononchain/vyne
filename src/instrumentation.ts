/**
 * Next.js instrumentation hook — runs once when the server process boots.
 *
 * We use it to start the BullMQ workflow worker IN-PROCESS with the
 * Next.js standalone server (`node server.js`). Previously the worker was
 * never started in production, so enqueued jobs were never consumed.
 *
 * Only runs on the Node.js runtime (not Edge), and is a no-op without
 * REDIS_URL or when RUN_WORKER=false.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { startWorkflowWorker } = await import("./lib/server/start-worker");
    await startWorkflowWorker();
  } catch (err) {
    console.error("[Instrumentation] Failed to start workflow worker:", err);
  }
}
