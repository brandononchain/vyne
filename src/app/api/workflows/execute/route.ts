import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { enqueueWorkflowExecution } from "@/lib/server/queue";

// ── POST /api/workflows/execute — Trigger a workflow run ─────────────
//
// This does NOT execute the workflow synchronously. It:
// 1. Validates the request and checks credits
// 2. Creates an ExecutionLog entry (status: QUEUED)
// 3. Adds a job to the BullMQ Redis queue
// 4. Returns the jobId immediately (< 200ms response time)
//
// The actual execution happens in the worker process (worker.ts).

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { workflowId, type = "run" } = body as {
      workflowId: string;
      type?: "simulation" | "run";
    };

    if (!workflowId) {
      return NextResponse.json(
        { error: "Missing required field: workflowId" },
        { status: 400 }
      );
    }

    // ── 1. Load workflow and user ──────────────────────
    const [workflow, user] = await Promise.all([
      db.workflow.findFirst({
        where: { id: workflowId, userId },
      }),
      db.user.findUnique({
        where: { id: userId },
      }),
    ]);

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // ── 2. Check credits ───────────────────────────────
    const creditCost = type === "simulation" ? 5 : 10;
    const remaining = user.creditsTotal - user.creditsUsed;

    if (remaining < creditCost) {
      return NextResponse.json(
        {
          error: "Insufficient credits",
          required: creditCost,
          remaining,
          message: `This ${type} costs ${creditCost} credits. You have ${remaining} remaining.`,
        },
        { status: 402 }
      );
    }

    // ── 3. Parse graph for step count ──────────────────
    const graphJson = workflow.graphJson as Record<string, unknown>;
    const executionOrder = (graphJson as { executionOrder?: unknown[] })
      .executionOrder;
    const stepsTotal = Array.isArray(executionOrder)
      ? executionOrder.length
      : 0;

    // ── 4. Create execution log ────────────────────────
    const executionLog = await db.executionLog.create({
      data: {
        workflowId,
        userId,
        type: type === "simulation" ? "SIMULATION" : "RUN",
        status: "QUEUED",
        stepsTotal,
      },
    });

    // ── 5. Enqueue the job ─────────────────────────────
    const jobId = await enqueueWorkflowExecution({
      executionLogId: executionLog.id,
      workflowId,
      userId,
      graphJson,
      type,
    });

    // Update the execution log with the job ID
    if (jobId) {
      await db.executionLog.update({
        where: { id: executionLog.id },
        data: { jobId },
      });
    }

    // ── 6. Return immediately ──────────────────────────
    return NextResponse.json(
      {
        executionId: executionLog.id,
        jobId: jobId ?? "queue-unavailable",
        status: "QUEUED",
        stepsTotal,
        creditCost,
        message: `Workflow queued for ${type}. Track progress with the execution ID.`,
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("[API] POST /api/workflows/execute error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
