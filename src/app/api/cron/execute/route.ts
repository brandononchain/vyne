/**
 * ── POST /api/cron/execute ──────────────────────────────────────────
 *
 * Called by Railway cron job or external scheduler (e.g. cron-job.org).
 * Finds all LIVE workflows with SCHEDULE trigger and enqueues them.
 *
 * Security: Requires CRON_SECRET env var to prevent unauthorized calls.
 *
 * Setup:
 *   Railway: Add a cron job that POSTs to this endpoint every minute
 *   External: Use cron-job.org to POST every 5 minutes with the secret
 *
 * curl -X POST https://your-app.railway.app/api/cron/execute \
 *   -H "Authorization: Bearer YOUR_CRON_SECRET"
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { enqueueWorkflowExecution } from "@/lib/server/queue";

export async function POST(request: NextRequest) {
  // ── Auth ───────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    // Find all LIVE scheduled workflows
    const scheduledWorkflows = await db.workflow.findMany({
      where: {
        status: "LIVE",
        triggerType: "SCHEDULE",
      },
      include: { user: true },
    });

    if (scheduledWorkflows.length === 0) {
      return NextResponse.json({ message: "No scheduled workflows to execute", executed: 0 });
    }

    const results: Array<{ workflowId: string; name: string; status: string }> = [];

    for (const workflow of scheduledWorkflows) {
      // Check credits
      const remaining = workflow.user.creditsTotal - workflow.user.creditsUsed;
      if (remaining < 10) {
        results.push({ workflowId: workflow.id, name: workflow.name, status: "skipped_no_credits" });
        continue;
      }

      const graphJson = workflow.graphJson as Record<string, unknown>;
      const compiled = (graphJson as { compiled?: Record<string, unknown> }).compiled || graphJson;
      const executionOrder = (compiled.executionOrder || []) as Array<{ nodeId: string }>;

      // Create execution log
      const executionLog = await db.executionLog.create({
        data: {
          workflowId: workflow.id,
          userId: workflow.user.id,
          type: "RUN",
          status: "QUEUED",
          stepsTotal: executionOrder.length,
          inputJson: { source: "cron", scheduledAt: new Date().toISOString() },
          startedAt: new Date(),
        },
      });

      // Enqueue for background execution
      const jobId = await enqueueWorkflowExecution({
        executionLogId: executionLog.id,
        workflowId: workflow.id,
        userId: workflow.user.id,
        graphJson: compiled as Record<string, unknown>,
        type: "run",
      });

      if (jobId) {
        results.push({ workflowId: workflow.id, name: workflow.name, status: "queued" });
      } else {
        // No Redis — mark as failed
        await db.executionLog.update({
          where: { id: executionLog.id },
          data: { status: "FAILED", errorMessage: "No Redis available for background execution" },
        });
        results.push({ workflowId: workflow.id, name: workflow.name, status: "failed_no_redis" });
      }
    }

    return NextResponse.json({
      message: `Processed ${scheduledWorkflows.length} scheduled workflows`,
      executed: results.filter((r) => r.status === "queued").length,
      results,
    });
  } catch (error) {
    console.error("[Cron] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
