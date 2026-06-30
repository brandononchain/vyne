import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/server/db";
import { enqueueWorkflowExecution } from "@/lib/server/queue";
import { CREDIT_COSTS } from "@/lib/server/engine/config";
import { parse, executeWorkflowSchema } from "@/lib/server/validation";

// ── GET /api/workflows/execute?executionId=… — poll execution status ─

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({ where: { clerkId }, select: { id: true } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const executionId = new URL(request.url).searchParams.get("executionId");
    if (!executionId) return NextResponse.json({ error: "Missing executionId" }, { status: 400 });

    const log = await db.executionLog.findFirst({
      where: { id: executionId, userId: user.id },
      select: {
        id: true, status: true, stepsTotal: true, stepsCompleted: true,
        durationMs: true, creditsUsed: true, errorMessage: true,
        outputJson: true, stepLogs: true, startedAt: true, completedAt: true, createdAt: true,
      },
    });
    if (!log) return NextResponse.json({ error: "Execution not found" }, { status: 404 });

    return NextResponse.json({ execution: log });
  } catch (error) {
    console.error("[API] GET /api/workflows/execute error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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

    const parsed = parse(executeWorkflowSchema, await request.json());
    if (!parsed.ok) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error }, { status: 400 });
    }
    const { workflowId, type, input } = parsed.data;

    // Load workflow
    const workflow = await db.workflow.findFirst({
      where: { id: workflowId, userId: user.id },
    });

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    const creditCost = CREDIT_COSTS[type] ?? CREDIT_COSTS.run;

    // ── Atomically RESERVE credits ────────────────────────────────────
    // A single conditional UPDATE prevents the TOCTOU race where many
    // jobs are enqueued concurrently before any decrement lands. The
    // worker settles on success and refunds on terminal failure.
    const reservation = await db.user.updateMany({
      where: { id: user.id, creditsUsed: { lte: user.creditsTotal - creditCost } },
      data: { creditsUsed: { increment: creditCost } },
    });

    if (reservation.count === 0) {
      return NextResponse.json({
        error: "Insufficient credits",
        required: creditCost,
        remaining: user.creditsTotal - user.creditsUsed,
      }, { status: 402 });
    }

    // Parse step count (supports both { compiled } and top-level shapes)
    const graphJson = workflow.graphJson as Record<string, unknown>;
    const compiled = (graphJson.compiled && typeof graphJson.compiled === "object"
      ? graphJson.compiled
      : graphJson) as { executionOrder?: unknown[] };
    const stepsTotal = Array.isArray(compiled.executionOrder) ? compiled.executionOrder.length : 0;

    // Create execution log
    const executionLog = await db.executionLog.create({
      data: {
        workflowId,
        userId: user.id,
        type: type === "simulation" ? "SIMULATION" : "RUN",
        status: "QUEUED",
        stepsTotal,
        creditsUsed: creditCost,
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

    if (!jobId) {
      // Queue unavailable — refund the reservation and surface an error
      // rather than silently accepting a job nothing will ever run.
      await db.user.update({
        where: { id: user.id },
        data: { creditsUsed: { decrement: creditCost } },
      }).catch(() => {});
      await db.executionLog.update({
        where: { id: executionLog.id },
        data: { status: "FAILED", errorMessage: "Execution queue unavailable", creditsUsed: 0 },
      }).catch(() => {});
      return NextResponse.json({ error: "Execution queue unavailable" }, { status: 503 });
    }

    await db.executionLog.update({
      where: { id: executionLog.id },
      data: { jobId },
    });

    return NextResponse.json({
      executionId: executionLog.id,
      jobId,
      status: "QUEUED",
      stepsTotal,
      creditCost,
    }, { status: 202 });
  } catch (error) {
    console.error("[API] POST /api/workflows/execute error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
