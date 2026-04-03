import { Queue } from "bullmq";
import IORedis from "ioredis";

// ── Constants ────────────────────────────────────────────────────────

export const WORKFLOW_QUEUE_NAME = "workflow-execution";

// ── Redis Connection Factory ─────────────────────────────────────────

/**
 * Create a new ioredis connection for BullMQ.
 * Only call this at RUNTIME (in API routes or the worker), never at
 * module scope — Next.js imports modules during build/SSG and there's
 * no Redis available at that point.
 */
export function createRedisConnection(): IORedis | undefined {
  const url = process.env.REDIS_URL;
  if (!url) return undefined;

  return new IORedis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true, // Don't connect until first command
    retryStrategy(times) {
      return Math.min(times * 200, 10000);
    },
  });
}

// ── Lazy Queue Singleton ─────────────────────────────────────────────
// The queue is created on first use, NOT on module import.
// This prevents Redis connections during Next.js build/SSG.

let _queue: Queue | null | undefined;

function getQueue(): Queue | null {
  if (_queue !== undefined) return _queue;

  const url = process.env.REDIS_URL;
  if (!url) {
    _queue = null;
    return null;
  }

  _queue = new Queue(WORKFLOW_QUEUE_NAME, {
    connection: createRedisConnection()!,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: { age: 7 * 24 * 3600, count: 1000 },
      removeOnFail: { age: 30 * 24 * 3600 },
    },
  });

  return _queue;
}

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

// ── Enqueue ──────────────────────────────────────────────────────────

/**
 * Add a workflow execution job to the queue.
 * Returns the BullMQ job ID, or null if Redis is unavailable.
 */
export async function enqueueWorkflowExecution(
  data: WorkflowJobData
): Promise<string | null> {
  const queue = getQueue();
  if (!queue) {
    console.warn("[Vyne Queue] Cannot enqueue — REDIS_URL not set");
    return null;
  }

  const job = await queue.add("execute-workflow", data, {
    jobId: `exec-${data.executionLogId}`,
  });

  return job.id ?? null;
}
