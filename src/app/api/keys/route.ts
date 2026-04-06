import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/server/db";
import { createHash, randomBytes } from "crypto";

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

function generateApiKey(): string {
  const prefix = "vyne_sk_";
  const random = randomBytes(24).toString("base64url");
  return `${prefix}${random}`;
}

// ── GET /api/keys — List user's API keys ─────────────────────────────

export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({ where: { clerkId } });
    if (!user) return NextResponse.json({ keys: [] });

    const keys = await db.apiKey.findMany({
      where: { userId: user.id, revoked: false },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ keys });
  } catch (error) {
    console.error("[API] GET /api/keys error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── POST /api/keys — Generate a new API key ─────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({ where: { clerkId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await request.json();
    const { name } = body;

    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    // Generate key
    const rawKey = generateApiKey();
    const keyH = hashKey(rawKey);
    const keyPrefix = rawKey.slice(0, 16);

    await db.apiKey.create({
      data: {
        userId: user.id,
        orgId: user.organizationId,
        name,
        keyHash: keyH,
        keyPrefix,
      },
    });

    // Return the raw key ONCE — it's never stored in plain text
    return NextResponse.json({
      key: rawKey,
      keyPrefix,
      name,
      message: "Save this key — you won't be able to see it again.",
    }, { status: 201 });
  } catch (error) {
    console.error("[API] POST /api/keys error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── DELETE /api/keys — Revoke an API key ─────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({ where: { clerkId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get("id");
    if (!keyId) return NextResponse.json({ error: "Key ID required" }, { status: 400 });

    await db.apiKey.updateMany({
      where: { id: keyId, userId: user.id },
      data: { revoked: true },
    });

    return NextResponse.json({ revoked: true });
  } catch (error) {
    console.error("[API] DELETE /api/keys error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
