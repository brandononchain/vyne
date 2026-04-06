import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/server/db";
import { enqueueWorkflowExecution } from "@/lib/server/queue";

// ── POST /api/workflows/execute — Trigger a workflow run ─────────────

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({ where: { clerkId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { workflowId, type = "run", input } = body as {
      workflowId: string;
      type?: "simulation" | "run";
      input?: Record<string, unknown>;
    };

    if (!workflowId) {
      return NextResponse.json({ error: "Missing workflowId" }, { status: 400 });
    }

    // Load workflow
    const workflow = await db.workflow.findFirst({
      where: { id: workflowId, userId: user.id },
    });

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    // Check credits
    const creditCost = type === "simulation" ? 5 : 10;
    const remaining = user.creditsTotal - user.creditsUsed;

    if (remaining < creditCost) {
      return NextResponse.json({
        error: "Insufficient credits",
        required: creditCost,
        remaining,
      }, { status: 402 });
    }

    // Parse step count
    const graphJson = workflow.graphJson as Record<string, unknown>;
    const executionOrder = (graphJson as { executionOrder?: unknown[] }).executionOrder;
    const stepsTotal = Array.isArray(executionOrder) ? executionOrder.length : 0;

    // Create execution log
    const executionLog = await db.executionLog.create({
      data: {
        workflowId,
        userId: user.id,
        type: type === "simulation" ? "SIMULATION" : "RUN",
        status: "QUEUED",
        stepsTotal,
        inputJson: input || null,
      },
    });

    // Enqueue to Redis/BullMQ
    const jobId = await enqueueWorkflowExecution({
      executionLogId: executionLog.id,
      workflowId,
      userId: user.id,
      graphJson,
      type,
    });

    if (jobId) {
      await db.executionLog.update({
        where: { id: executionLog.id },
        data: { jobId },
      });
    }

    return NextResponse.json({
      executionId: executionLog.id,
      jobId: jobId ?? "queue-unavailable",
      status: "QUEUED",
      stepsTotal,
      creditCost,
    }, { status: 202 });
  } catch (error) {
    console.error("[API] POST /api/workflows/execute error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
