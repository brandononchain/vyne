/**
 * ── Vyne Workflow Worker ─────────────────────────────────────────────
 *
 * This file runs OUTSIDE the Next.js process — typically as a separate
 * Railway service or a long-running Node process:
 *
 *   npx tsx src/lib/server/worker.ts
 *
 * It processes jobs from the "workflow-execution" BullMQ queue by:
 * 1. Loading the workflow graph from the database
 * 2. Walking the execution order (topological sort)
 * 3. Calling LLM APIs for each agent/task step
 * 4. Recording results in the ExecutionLog
 * 5. Deducting credits from the user
 *
 * For the MVP, steps 2-3 are simulated with delays.
 */

import { Worker, type Job } from "bullmq";
import { db } from "./db";
import { createRedisConnection, WORKFLOW_QUEUE_NAME } from "./queue";
import type { WorkflowJobData, WorkflowJobResult } from "./queue";

const connection = createRedisConnection();

if (!connection) {
  console.error("[Worker] REDIS_URL not configured. Exiting.");
  process.exit(1);
}

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

      // ── 2. Parse execution order from graph ──────────
      const graph = graphJson as {
        executionOrder?: { nodeId: string; name: string; simulationDuration: number }[];
      };
      const steps = graph.executionOrder ?? [];
      const totalSteps = steps.length;

      // ── 3. Execute each step ─────────────────────────
      // In production, this is where you'd call CrewAI / LangGraph / OpenAI.
      // For the MVP, we simulate each step with a delay.
      for (let i = 0; i < totalSteps; i++) {
        const step = steps[i];

        // Report progress to BullMQ (visible via job.progress)
        await job.updateProgress(Math.round(((i + 1) / totalSteps) * 100));

        // Update the execution log with current step count
        await db.executionLog.update({
          where: { id: executionLogId },
          data: { stepsCompleted: i + 1 },
        });

        console.log(
          `[Worker]   Step ${i + 1}/${totalSteps}: ${step.name}`
        );

        // ── TODO: Replace with actual LLM execution ────
        // const result = await executeAgentStep(step, previousOutput);
        await simulateStep(step.simulationDuration || 2000);
      }

      // ── 4. Calculate costs ───────────────────────────
      const creditsUsed = type === "simulation" ? 5 : 10;
      const durationMs = Date.now() - startTime;

      // ── 5. Mark execution as COMPLETED ───────────────
      await db.executionLog.update({
        where: { id: executionLogId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          durationMs,
          creditsUsed,
          stepsCompleted: totalSteps,
          outputJson: {
            summary: `Successfully executed ${totalSteps} steps in ${(durationMs / 1000).toFixed(1)}s`,
            stepsCompleted: totalSteps,
          },
        },
      });

      // ── 6. Deduct credits from user ──────────────────
      await db.user.update({
        where: { id: userId },
        data: { creditsUsed: { increment: creditsUsed } },
      });

      console.log(
        `[Worker] Job ${job.id} completed in ${durationMs}ms (${creditsUsed} credits)`
      );

      return {
        stepsCompleted: totalSteps,
        stepsTotal: totalSteps,
        durationMs,
        creditsUsed,
        outputJson: { summary: `Executed ${totalSteps} steps` },
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
            errorMessage,
          },
        })
        .catch(() => {}); // Don't fail the job if logging fails

      console.error(`[Worker] Job ${job.id} failed:`, errorMessage);
      throw error; // Let BullMQ retry
    }
  },
  {
    connection,
    concurrency: 5, // Process up to 5 workflows in parallel
    limiter: {
      max: 20,       // Max 20 jobs
      duration: 60000, // Per minute
    },
  }
);

// ── Lifecycle events ─────────────────────────────────────────────────

worker.on("completed", (job) => {
  console.log(`[Worker] Job ${job.id} completed successfully`);
});

worker.on("failed", (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message);
});

worker.on("error", (err) => {
  console.error("[Worker] Worker error:", err);
});

console.log(`[Worker] Listening for jobs on queue "${WORKFLOW_QUEUE_NAME}"...`);

// ── Helper ───────────────────────────────────────────────────────────

function simulateStep(durationMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}
