import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/server/db";
import { parse, chatMessageSchema } from "@/lib/server/validation";

// ── GET /api/chat — Load chat history ────────────────────────────────

export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({ where: { clerkId } });
    if (!user) return NextResponse.json({ messages: [] });

    const messages = await db.chatMessage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    return NextResponse.json({
      messages: messages.map((m: { id: string; role: string; content: string; metadata: unknown; createdAt: Date }) => ({
        id: m.id,
        role: m.role.toLowerCase(),
        content: m.content,
        metadata: m.metadata,
        timestamp: m.createdAt.getTime(),
      })),
    });
  } catch (error) {
    console.error("[API] GET /api/chat error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── POST /api/chat — Save a message ──────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({ where: { clerkId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const parsed = parse(chatMessageSchema, await request.json());
    if (!parsed.ok) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error }, { status: 400 });
    }
    const { role, content, metadata } = parsed.data;

    const message = await db.chatMessage.create({
      data: {
        userId: user.id,
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

// ── DELETE /api/chat — Clear chat history ────────────────────────────

export async function DELETE() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({ where: { clerkId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    await db.chatMessage.deleteMany({ where: { userId: user.id } });

    return NextResponse.json({ cleared: true });
  } catch (error) {
    console.error("[API] DELETE /api/chat error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
