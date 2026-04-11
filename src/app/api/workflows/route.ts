import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/server/db";

// ── GET /api/workflows — List user's workflows ───────────────────────

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find user by clerkId
    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return NextResponse.json({ workflows: [] });
    }

    const workflows = await db.workflow.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        triggerType: true,
        graphJson: true,
        agentCount: true,
        taskCount: true,
        endpointUrl: true,
        apiKey: true,
        webhookSecret: true,
        deployedAt: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { executionLogs: true } },
      },
    });

    return NextResponse.json({ workflows });
  } catch (error) {
    console.error("[API] GET /api/workflows error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── POST /api/workflows — Save a workflow ────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find or create user
    let user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      // Auto-create user on first workflow save (webhook may not have fired yet)
      user = await db.user.create({
        data: {
          clerkId: userId,
          email: `${userId}@pending.vyne.ai`,
          plan: "HOBBY",
          creditsTotal: 1000,
          creditsUsed: 0,
        },
      });
    }

    const body = await request.json();
    const { name, description, graphJson, triggerType, agentCount, taskCount, status, apiKey: deployApiKey, webhookSecret, endpointUrl } = body;

    if (!name || !graphJson) {
      return NextResponse.json({ error: "Missing required fields: name, graphJson" }, { status: 400 });
    }

    const workflow = await db.workflow.create({
      data: {
        userId: user.id,
        name,
        description: description || null,
        graphJson,
        triggerType: triggerType ? triggerType.toUpperCase() : null,
        agentCount: agentCount || 0,
        taskCount: taskCount || 0,
        status: status || "DRAFT",
        deployedAt: status === "LIVE" ? new Date() : null,
        apiKey: deployApiKey || null,
        webhookSecret: webhookSecret || null,
        endpointUrl: endpointUrl || null,
      },
    });

    return NextResponse.json({
      id: workflow.id,
      name: workflow.name,
      status: workflow.status,
      createdAt: workflow.createdAt,
    }, { status: 201 });
  } catch (error) {
    console.error("[API] POST /api/workflows error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
