import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";

// ── POST /api/workflows — Save a workflow to the database ────────────

export async function POST(request: NextRequest) {
  try {
    // In production, extract the Clerk user ID from the session:
    // const { userId } = await auth();
    // For now, use a header-based approach for flexibility
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, graphJson, triggerType, agentCount, taskCount } = body;

    if (!name || !graphJson) {
      return NextResponse.json(
        { error: "Missing required fields: name, graphJson" },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const workflow = await db.workflow.create({
      data: {
        userId,
        name,
        description: description || null,
        graphJson,
        triggerType: triggerType
          ? (triggerType.toUpperCase() as "API" | "WEBHOOK" | "SCHEDULE")
          : null,
        agentCount: agentCount || 0,
        taskCount: taskCount || 0,
        status: "DRAFT",
      },
    });

    return NextResponse.json(
      {
        id: workflow.id,
        name: workflow.name,
        status: workflow.status,
        createdAt: workflow.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API] POST /api/workflows error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ── GET /api/workflows — List user's workflows ───────────────────────

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const workflows = await db.workflow.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        triggerType: true,
        agentCount: true,
        taskCount: true,
        deployedAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { executionLogs: true },
        },
      },
    });

    return NextResponse.json({ workflows });
  } catch (error) {
    console.error("[API] GET /api/workflows error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
