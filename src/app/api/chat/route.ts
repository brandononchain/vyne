import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/server/db";

// ── GET /api/chat — Load chat history (optionally scoped to workflow) ──

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({ where: { clerkId } });
    if (!user) return NextResponse.json({ messages: [] });

    const workflowId = request.nextUrl.searchParams.get("workflowId");

    const messages = await db.chatMessage.findMany({
      where: {
        userId: user.id,
        ...(workflowId ? { workflowId } : {}),
      },
      orderBy: { createdAt: "asc" },
      take: 200,
    });

    return NextResponse.json({
      messages: messages.map((m: { id: string; role: string; content: string; metadata: unknown; createdAt: Date; workflowId: string | null }) => ({
        id: m.id,
        role: m.role.toLowerCase(),
        content: m.content,
        metadata: m.metadata,
        workflowId: m.workflowId,
        timestamp: m.createdAt.getTime(),
      })),
    });
  } catch (error) {
    console.error("[API] GET /api/chat error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── POST /api/chat — Save a message (optionally scoped to workflow) ──

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({ where: { clerkId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await request.json();
    const { role, content, metadata, workflowId } = body;

    const message = await db.chatMessage.create({
      data: {
        userId: user.id,
        workflowId: workflowId || null,
        role: role === "vyne" ? "VYNE" : "USER",
        content,
        metadata: metadata || null,
      },
    });

    return NextResponse.json({ id: message.id }, { status: 201 });
  } catch (error) {
    console.error("[API] POST /api/chat error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── DELETE /api/chat — Clear chat (optionally for a specific workflow) ──

export async function DELETE(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({ where: { clerkId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const workflowId = request.nextUrl.searchParams.get("workflowId");

    await db.chatMessage.deleteMany({
      where: {
        userId: user.id,
        ...(workflowId ? { workflowId } : {}),
      },
    });

    return NextResponse.json({ cleared: true });
  } catch (error) {
    console.error("[API] DELETE /api/chat error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
