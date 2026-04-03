import { Queue, type ConnectionOptions } from "bullmq";
import IORedis from "ioredis";

// ── Redis Connection ─────────────────────────────────────────────────

const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
  console.warn(
    "[Vyne Queue] REDIS_URL not set. Queue features will be unavailable."
  );
}

/**
 * Shared Redis connection factory.
 * BullMQ requires a raw ioredis connection, not a URL string.
 */
export function createRedisConnection(): IORedis | undefined {
  if (!REDIS_URL) return undefined;

  return new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
    retryStrategy(times) {
      // Exponential backoff: 200ms, 400ms, 800ms... up to 10s
      return Math.min(times * 200, 10000);
    },
  });
}

const connection: ConnectionOptions | undefined = REDIS_URL
  ? { url: REDIS_URL }
  : undefined;

// ── Workflow Execution Queue ─────────────────────────────────────────

export const WORKFLOW_QUEUE_NAME = "workflow-execution";

/**
 * The main job queue for executing agent workflows.
 * Jobs are added when a user clicks "Run" or a webhook/cron trigger fires.
 */
export const workflowQueue = connection
  ? new Queue(WORKFLOW_QUEUE_NAME, {
      connection: createRedisConnection()!,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000, // 2s, 4s, 8s
        },
        removeOnComplete: {
          age: 7 * 24 * 3600, // Keep completed jobs for 7 days
          count: 1000,
        },
        removeOnFail: {
          age: 30 * 24 * 3600, // Keep failed jobs for 30 days
        },
      },
    })
  : null;

// ── Job Data Types ───────────────────────────────────────────────────

export interface WorkflowJobData {
  executionLogId: string;
  workflowId: string;
  userId: string;
  graphJson: Record<string, unknown>;
  type: "simulation" | "run";
}

export interface WorkflowJobResult {
  stepsCompleted: number;
  stepsTotal: number;
  durationMs: number;
  creditsUsed: number;
  outputJson: Record<string, unknown>;
}

/**
 * Add a workflow execution job to the queue.
 * Returns the BullMQ job ID, or null if the queue is unavailable.
 */
export async function enqueueWorkflowExecution(
  data: WorkflowJobData
): Promise<string | null> {
  if (!workflowQueue) {
    console.warn("[Vyne Queue] Cannot enqueue — queue not available");
    return null;
  }

  const job = await workflowQueue.add("execute-workflow", data, {
    jobId: `exec-${data.executionLogId}`,
  });

  return job.id ?? null;
}
