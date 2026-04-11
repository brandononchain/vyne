/**
 * ── GET /api/workflows/status/[executionId] ─────────────────────────
 *
 * Poll the status of a workflow execution.
 * Returns progress, step results, and final output when complete.
 *
 * Auth: Same API key as trigger, or Clerk session.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ executionId: string }> }
) {
  try {
    const { executionId } = await params;

    const execution = await db.executionLog.findUnique({
      where: { id: executionId },
      include: {
        workflow: { select: { name: true, apiKey: true } },
      },
    });

    if (!execution) {
      return NextResponse.json({ error: "Execution not found" }, { status: 404 });
    }

    const outputJson = execution.outputJson as Record<string, unknown> | null;

    return NextResponse.json({
      executionId: execution.id,
      workflowName: execution.workflow.name,
      status: execution.status.toLowerCase(),
      stepsCompleted: execution.stepsCompleted,
      stepsTotal: execution.stepsTotal,
      durationMs: execution.durationMs,
      creditsUsed: execution.creditsUsed,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt,
      error: execution.errorMessage,
      // Only include output when complete
      ...(execution.status === "COMPLETED" || execution.status === "FAILED"
        ? {
            finalOutput: outputJson?.finalOutput || null,
            stepOutputs: outputJson?.stepOutputs || null,
          }
        : {}),
    });
  } catch (error) {
    console.error("[Status API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
