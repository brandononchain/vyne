/**
 * ── Vyne Workflow Worker ─────────────────────────────────────────────
 *
 * Runs OUTSIDE the Next.js process — as a separate Railway service
 * or a long-running Node process:
 *
 *   npx tsx src/lib/server/worker.ts
 *
 * Processes jobs from the BullMQ "workflow-execution" queue by:
 * 1. Loading the workflow graph JSON from the job data
 * 2. Compiling it into an executable LangGraph
 * 3. Running the graph with Anthropic (Claude) as the LLM
 * 4. Streaming step progress to the Postgres ExecutionLog
 * 5. Deducting credits from the user on completion
 */

import { Worker, type Job } from "bullmq";
import { db } from "./db";
import { createRedisConnection, WORKFLOW_QUEUE_NAME } from "./queue";
import type { WorkflowJobData, WorkflowJobResult } from "./queue";
import {
  executeWorkflow,
  type StepProgress,
} from "./engine/compiler";

const connection = createRedisConnection();

if (!connection) {
  console.error("[Worker] REDIS_URL not configured. Exiting.");
  process.exit(1);
}

// ── Credit costs per action type ─────────────────────────────────────
const CREDIT_COSTS = {
  simulation: 5,
  run: 10,
} as const;

// ── Main worker ──────────────────────────────────────────────────────

const worker = new Worker<WorkflowJobData, WorkflowJobResult>(
  WORKFLOW_QUEUE_NAME,
  async (job: Job<WorkflowJobData, WorkflowJobResult>) => {
    const { executionLogId, workflowId, userId, graphJson, type } = job.data;
    const startTime = Date.now();

    console.log(
      `[Worker] Processing job ${job.id} — workflow ${workflowId} (${type})`
    );

    try {
      // ── 1. Mark execution as RUNNING ─────────────────
      await db.executionLog.update({
        where: { id: executionLogId },
        data: {
          status: "RUNNING",
          startedAt: new Date(),
        },
      });

      // ── 2. Parse the compiled workflow payload ───────
      const payload = graphJson as unknown as Parameters<typeof executeWorkflow>[0];
      const totalSteps = payload.executionOrder?.length ?? 0;

      // ── 3. Progress callback ─────────────────────────
      // Updates both BullMQ job progress AND Postgres ExecutionLog
      // so the frontend can poll for live updates.
      const onProgress = async (progress: StepProgress) => {
        const percentComplete = Math.round(
          ((progress.stepIndex + (progress.status === "complete" ? 1 : 0.5)) / totalSteps) * 100
        );

        // Update BullMQ job progress (visible via job.progress)
        await job.updateProgress(percentComplete);

        // Update Postgres execution log
        if (progress.status === "complete") {
          await db.executionLog.update({
            where: { id: executionLogId },
            data: { stepsCompleted: progress.stepIndex + 1 },
          });
        }

        const statusEmoji =
          progress.status === "running" ? "⚙️" :
          progress.status === "complete" ? "✅" : "❌";

        console.log(
          `[Worker]   ${statusEmoji} Step ${progress.stepIndex + 1}/${totalSteps}: ${progress.nodeName} [${progress.status}]`
        );
      };

      // ── 4. Execute the LangGraph ─────────────────────
      const finalState = await executeWorkflow(payload, onProgress);

      // ── 5. Calculate costs ───────────────────────────
      const creditsUsed = CREDIT_COSTS[type] ?? CREDIT_COSTS.run;
      const durationMs = Date.now() - startTime;

      // ── 6. Mark execution as COMPLETED ───────────────
      await db.executionLog.update({
        where: { id: executionLogId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          durationMs,
          creditsUsed,
          stepsCompleted: totalSteps,
          outputJson: {
            summary: `Executed ${totalSteps} steps in ${(durationMs / 1000).toFixed(1)}s`,
            finalOutput: finalState.previousOutput?.slice(0, 2000) ?? "",
            stepOutputs: finalState.stepOutputs ?? {},
          },
        },
      });

      // ── 7. Deduct credits from user ──────────────────
      await db.user.update({
        where: { id: userId },
        data: { creditsUsed: { increment: creditsUsed } },
      });

      console.log(
        `[Worker] Job ${job.id} completed in ${durationMs}ms (${creditsUsed} credits, ${totalSteps} steps)`
      );

      return {
        stepsCompleted: totalSteps,
        stepsTotal: totalSteps,
        durationMs,
        creditsUsed,
        outputJson: {
          summary: `Executed ${totalSteps} steps`,
          finalOutput: finalState.previousOutput?.slice(0, 500) ?? "",
        },
      };
    } catch (error) {
      // ── Handle failure ───────────────────────────────
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      await db.executionLog
        .update({
          where: { id: executionLogId },
          data: {
            status: "FAILED",
            completedAt: new Date(),
            durationMs: Date.now() - startTime,
            errorMessage,
          },
        })
        .catch(() => {}); // Don't fail the job if logging fails

      console.error(`[Worker] Job ${job.id} failed:`, errorMessage);
      throw error; // Let BullMQ retry with exponential backoff
    }
  },
  {
    connection,
    concurrency: 5,
    limiter: {
      max: 20,
      duration: 60000,
    },
  }
);

// ── Lifecycle events ─────────────────────────────────────────────────

worker.on("completed", (job) => {
  console.log(`[Worker] ✅ Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[Worker] ❌ Job ${job?.id} failed after retries:`, err.message);
});

worker.on("error", (err) => {
  console.error("[Worker] Worker error:", err);
});

console.log(`[Worker] 🚀 Listening for jobs on queue "${WORKFLOW_QUEUE_NAME}"...`);
