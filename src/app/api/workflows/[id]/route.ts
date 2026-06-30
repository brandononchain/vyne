import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/server/db";
import { parse, updateWorkflowSchema } from "@/lib/server/validation";

// ── Resolve the authenticated user's DB id ───────────────────────────

async function getUserId(): Promise<string | null> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;
  const user = await db.user.findUnique({ where: { clerkId }, select: { id: true } });
  return user?.id ?? null;
}

// ── GET /api/workflows/[id] — fetch a single workflow (for editing) ──

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const workflow = await db.workflow.findFirst({
      where: { id, userId },
    });
    if (!workflow) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

    return NextResponse.json({ workflow });
  } catch (error) {
    console.error("[API] GET /api/workflows/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── PUT /api/workflows/[id] — update a workflow ──────────────────────

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const parsed = parse(updateWorkflowSchema, await request.json());
    if (!parsed.ok) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error }, { status: 400 });
    }
    const body = parsed.data;

    // Ownership check before mutating.
    const existing = await db.workflow.findFirst({ where: { id, userId }, select: { id: true, status: true } });
    if (!existing) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

    const becomingLive = body.status === "LIVE" && existing.status !== "LIVE";

    const workflow = await db.workflow.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.graphJson !== undefined ? { graphJson: body.graphJson, version: { increment: 1 } } : {}),
        ...(body.triggerType !== undefined
          ? { triggerType: body.triggerType ? body.triggerType.toUpperCase() : null }
          : {}),
        ...(body.agentCount !== undefined ? { agentCount: body.agentCount } : {}),
        ...(body.taskCount !== undefined ? { taskCount: body.taskCount } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(becomingLive ? { deployedAt: new Date() } : {}),
      },
    });

    return NextResponse.json({
      id: workflow.id,
      name: workflow.name,
      status: workflow.status,
      updatedAt: workflow.updatedAt,
    });
  } catch (error) {
    console.error("[API] PUT /api/workflows/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── DELETE /api/workflows/[id] — delete a workflow ───────────────────

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    // Scope the delete to the owner; deleteMany avoids throwing on no-match.
    const result = await db.workflow.deleteMany({ where: { id, userId } });
    if (result.count === 0) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("[API] DELETE /api/workflows/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
