/**
 * ── Workflow Worker Bootstrap ────────────────────────────────────────
 *
 * Starts the BullMQ worker that consumes the workflow-execution queue and
 * runs the LangGraph engine. This is invoked from `src/instrumentation.ts`
 * so the worker runs IN-PROCESS with the Next.js server (`node server.js`)
 * in production — previously the worker was never started at all.
 *
 * Guarded so it only ever starts once per process, and is a no-op when
 * REDIS_URL is absent or RUN_WORKER=false (e.g. if you split the worker
 * into its own service later).
 */

import { createRedisConnection, WORKFLOW_QUEUE_NAME } from "./queue";
import type { WorkflowJobData, WorkflowJobResult } from "./queue";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let workerInstance: any = null;
let started = false;

export async function startWorkflowWorker(): Promise<void> {
  if (started) return;
  started = true;

  if (process.env.RUN_WORKER === "false") {
    console.log("[Worker] RUN_WORKER=false — skipping in-process worker.");
    return;
  }

  const connection = createRedisConnection();
  if (!connection) {
    console.log("[Worker] ⚠️  REDIS_URL not set — background jobs disabled.");
    return;
  }

  const [{ Worker: BullWorker }, { db }, { executeWorkflow, normalizeWorkflowPayload }, { CREDIT_COSTS }] =
    await Promise.all([
      import("bullmq"),
      import("./db"),
      import("./engine/compiler"),
      import("./engine/config"),
    ]);

  workerInstance = new BullWorker<WorkflowJobData, WorkflowJobResult>(
    WORKFLOW_QUEUE_NAME,
    async (job) => {
      const { executionLogId, workflowId, userId, graphJson, type } = job.data;
      const creditsUsed = CREDIT_COSTS[type] ?? CREDIT_COSTS.run;
      const startTime = Date.now();
      console.log(`[Worker] Processing job ${job.id} — workflow ${workflowId} (${type})`);

      try {
        await db.executionLog.update({
          where: { id: executionLogId },
          data: { status: "RUNNING", startedAt: new Date() },
        });

        const payload = normalizeWorkflowPayload(graphJson);
        const totalSteps = payload.executionOrder?.length ?? 0;
        const stepLogs: Array<Record<string, unknown>> = [];

        const onProgress = async (progress: import("./engine/compiler").StepProgress) => {
          const pct = Math.round(
            ((progress.stepIndex + (progress.status === "complete" ? 1 : 0.5)) / Math.max(totalSteps, 1)) * 100
          );
          await job.updateProgress(pct);

          stepLogs.push({
            stepIndex: progress.stepIndex,
            nodeId: progress.nodeId,
            nodeName: progress.nodeName,
            status: progress.status,
            output: progress.output ?? null,
            error: progress.error ?? null,
            at: new Date().toISOString(),
          });

          await db.executionLog.update({
            where: { id: executionLogId },
            data: {
              stepLogs,
              ...(progress.status === "complete" ? { stepsCompleted: progress.stepIndex + 1 } : {}),
            },
          }).catch(() => {});

          const emoji = progress.status === "running" ? "⚙️" : progress.status === "complete" ? "✅" : "❌";
          console.log(`[Worker]   ${emoji} Step ${progress.stepIndex + 1}/${totalSteps}: ${progress.nodeName} [${progress.status}]`);
        };

        const finalState = await executeWorkflow(payload, onProgress);
        const durationMs = Date.now() - startTime;

        await db.executionLog.update({
          where: { id: executionLogId },
          data: {
            status: "COMPLETED", completedAt: new Date(), durationMs, creditsUsed,
            stepsCompleted: totalSteps,
            outputJson: {
              summary: `Executed ${totalSteps} steps in ${(durationMs / 1000).toFixed(1)}s`,
              finalOutput: finalState.previousOutput?.slice(0, 2000) ?? "",
              stepOutputs: finalState.stepOutputs ?? {},
            },
          },
        });

        console.log(`[Worker] Job ${job.id} completed in ${durationMs}ms (${creditsUsed} credits)`);
        return {
          stepsCompleted: totalSteps, stepsTotal: totalSteps, durationMs, creditsUsed,
          outputJson: { summary: `Executed ${totalSteps} steps`, finalOutput: finalState.previousOutput?.slice(0, 500) ?? "" },
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const maxAttempts = job.opts.attempts ?? 1;
        const isFinalAttempt = job.attemptsMade + 1 >= maxAttempts;
        if (isFinalAttempt) {
          // Refund the credits reserved at enqueue time, once.
          await db.user.update({
            where: { id: userId },
            data: { creditsUsed: { decrement: creditsUsed } },
          }).catch(() => {});
          await db.executionLog.update({
            where: { id: executionLogId },
            data: { status: "FAILED", completedAt: new Date(), durationMs: Date.now() - startTime, errorMessage, creditsUsed: 0 },
          }).catch(() => {});
        }
        console.error(`[Worker] Job ${job.id} failed:`, errorMessage);
        throw error;
      }
    },
    { connection, concurrency: 5, limiter: { max: 20, duration: 60000 } }
  );

  workerInstance.on("completed", (job: { id?: string }) => console.log(`[Worker] ✅ Job ${job.id} completed`));
  workerInstance.on("failed", (job: { id?: string } | undefined, err: Error) => console.error(`[Worker] ❌ Job ${job?.id} failed:`, err.message));
  workerInstance.on("error", (err: Error) => console.error("[Worker] Error:", err));
  console.log(`[Worker] 🚀 Listening for jobs on queue "${WORKFLOW_QUEUE_NAME}"...`);

  const shutdown = () => { workerInstance?.close?.(); };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
