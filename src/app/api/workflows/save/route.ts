/**
 * ── POST /api/workflows/save ────────────────────────────────────────
 *
 * Save or update a workflow with its canvas state.
 * If `id` is provided, updates the existing workflow.
 * If `id` is null/missing, creates a new workflow.
 *
 * Saves: name, description, nodes, edges, compiled graph
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/server/db";

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let user = await db.user.findUnique({ where: { clerkId } });
    if (!user) {
      user = await db.user.create({
        data: {
          clerkId,
          email: `${clerkId}@pending.vyne.ai`,
          plan: "HOBBY",
          creditsTotal: 1000,
          creditsUsed: 0,
        },
      });
    }

    const body = await request.json();
    const { id, name, description, nodes, edges, compiled } = body;

    if (!name) {
      return NextResponse.json({ error: "Workflow name is required" }, { status: 400 });
    }

    const agentCount = (nodes || []).filter((n: { data: { type: string } }) => n.data?.type === "agent").length;
    const taskCount = (nodes || []).filter((n: { data: { type: string } }) => n.data?.type === "task").length;

    const graphJson = {
      sourceNodes: nodes || [],
      sourceEdges: edges || [],
      compiled: compiled || null,
    };

    if (id) {
      // Update existing workflow
      const existing = await db.workflow.findFirst({
        where: { id, userId: user.id },
      });

      if (!existing) {
        return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
      }

      const updated = await db.workflow.update({
        where: { id },
        data: {
          name,
          description: description || null,
          graphJson,
          agentCount,
          taskCount,
          version: { increment: 1 },
        },
      });

      return NextResponse.json({
        id: updated.id,
        name: updated.name,
        version: updated.version,
        updatedAt: updated.updatedAt,
        isNew: false,
      });
    } else {
      // Create new workflow
      const workflow = await db.workflow.create({
        data: {
          userId: user.id,
          name,
          description: description || null,
          graphJson,
          agentCount,
          taskCount,
          status: "DRAFT",
        },
      });

      return NextResponse.json({
        id: workflow.id,
        name: workflow.name,
        version: 1,
        createdAt: workflow.createdAt,
        isNew: true,
      }, { status: 201 });
    }
  } catch (error) {
    console.error("[API] POST /api/workflows/save error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
