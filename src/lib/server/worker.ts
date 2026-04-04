/**
 * ── Vyne Entrypoint ────────────────────────────────────────────────
 *
 * This file is Railway's start command (npx tsx src/lib/server/worker.ts).
 * It does TWO things:
 *
 * 1. ALWAYS starts the Next.js HTTP server so the UI is accessible
 * 2. OPTIONALLY starts the BullMQ worker if REDIS_URL is configured
 *
 * This design lets a single Railway service serve both web traffic
 * and background job processing.
 */

import { spawn } from "child_process";
import { resolve } from "path";

// ── 1. Start Next.js HTTP server ────────────────────────────────────
// This MUST happen first so Railway's health check passes.

const PORT = process.env.PORT || "3000";
const HOST = "0.0.0.0";
const PROJECT_ROOT = resolve(__dirname, "..", "..", "..");

const nextBin = resolve(PROJECT_ROOT, "node_modules", ".bin", "next");
console.log(`[Vyne] 🌐 Starting Next.js on ${HOST}:${PORT}...`);

const nextProcess = spawn(nextBin, ["start", "-H", HOST, "-p", PORT], {
  stdio: "inherit",
  env: { ...process.env },
  cwd: PROJECT_ROOT,
});

nextProcess.on("error", (err: Error) => {
  console.error("[Vyne] Failed to start Next.js:", err.message);
  process.exit(1);
});

nextProcess.on("exit", (code: number | null) => {
  console.log(`[Vyne] Next.js exited with code ${code}`);
  process.exit(code || 0);
});

// ── 2. Start BullMQ worker (if Redis is available) ──────────────────

import { createRedisConnection, WORKFLOW_QUEUE_NAME } from "./queue";
import type { WorkflowJobData, WorkflowJobResult } from "./queue";

const connection = createRedisConnection();

let workerInstance: import("bullmq").Worker | null = null;

if (connection) {
  Promise.all([
    import("bullmq"),
    import("./db"),
    import("./engine/compiler"),
  ]).then(([{ Worker: BullWorker }, { db }, { executeWorkflow }]) => {
    const CREDIT_COSTS = { simulation: 5, run: 10 } as const;

    workerInstance = new BullWorker<WorkflowJobData, WorkflowJobResult>(
      WORKFLOW_QUEUE_NAME,
      async (job) => {
        const { executionLogId, workflowId, userId, graphJson, type } = job.data;
        const startTime = Date.now();
        console.log(`[Worker] Processing job ${job.id} — workflow ${workflowId} (${type})`);

        try {
          await db.executionLog.update({
            where: { id: executionLogId },
            data: { status: "RUNNING", startedAt: new Date() },
          });

          const payload = graphJson as unknown as Parameters<typeof executeWorkflow>[0];
          const totalSteps = payload.executionOrder?.length ?? 0;

          const onProgress = async (progress: import("./engine/compiler").StepProgress) => {
            const pct = Math.round(
              ((progress.stepIndex + (progress.status === "complete" ? 1 : 0.5)) / totalSteps) * 100
            );
            await job.updateProgress(pct);
            if (progress.status === "complete") {
              await db.executionLog.update({
                where: { id: executionLogId },
                data: { stepsCompleted: progress.stepIndex + 1 },
              });
            }
            const emoji = progress.status === "running" ? "⚙️" : progress.status === "complete" ? "✅" : "❌";
            console.log(`[Worker]   ${emoji} Step ${progress.stepIndex + 1}/${totalSteps}: ${progress.nodeName} [${progress.status}]`);
          };

          const finalState = await executeWorkflow(payload, onProgress);
          const creditsUsed = CREDIT_COSTS[type] ?? CREDIT_COSTS.run;
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

          await db.user.update({
            where: { id: userId },
            data: { creditsUsed: { increment: creditsUsed } },
          });

          console.log(`[Worker] Job ${job.id} completed in ${durationMs}ms (${creditsUsed} credits)`);
          return {
            stepsCompleted: totalSteps, stepsTotal: totalSteps, durationMs, creditsUsed,
            outputJson: { summary: `Executed ${totalSteps} steps`, finalOutput: finalState.previousOutput?.slice(0, 500) ?? "" },
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          await db.executionLog.update({
            where: { id: executionLogId },
            data: { status: "FAILED", completedAt: new Date(), durationMs: Date.now() - startTime, errorMessage },
          }).catch(() => {});
          console.error(`[Worker] Job ${job.id} failed:`, errorMessage);
          throw error;
        }
      },
      { connection, concurrency: 5, limiter: { max: 20, duration: 60000 } }
    );

    workerInstance!.on("completed", (job) => console.log(`[Worker] ✅ Job ${job.id} completed`));
    workerInstance!.on("failed", (job, err) => console.error(`[Worker] ❌ Job ${job?.id} failed:`, err.message));
    workerInstance!.on("error", (err) => console.error("[Worker] Error:", err));
    console.log(`[Worker] 🚀 Listening for jobs on queue "${WORKFLOW_QUEUE_NAME}"...`);
  }).catch((err) => {
    console.error("[Worker] Failed to initialize worker:", err);
  });
} else {
  console.log("[Worker] ⚠️  REDIS_URL not set — background jobs disabled. Next.js UI is still active.");
}

// ── Graceful shutdown ───────────────────────────────────────────────

process.on("SIGTERM", () => {
  console.log("[Vyne] SIGTERM received, shutting down...");
  nextProcess.kill("SIGTERM");
  workerInstance?.close();
});

process.on("SIGINT", () => {
  console.log("[Vyne] SIGINT received, shutting down...");
  nextProcess.kill("SIGINT");
  workerInstance?.close();
});
