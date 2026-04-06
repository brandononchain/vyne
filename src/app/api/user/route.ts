import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/server/db";

// ── GET /api/user — Get or create user profile from DB ───────────────

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let user = await db.user.findUnique({ where: { clerkId: userId } });

    // Auto-create if doesn't exist (first visit, webhook may not have fired)
    if (!user) {
      const clerkUser = await currentUser();
      user = await db.user.create({
        data: {
          clerkId: userId,
          email: clerkUser?.emailAddresses?.[0]?.emailAddress || `${userId}@pending.vyne.ai`,
          name: clerkUser ? [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null : null,
          avatarUrl: clerkUser?.imageUrl || null,
          plan: "HOBBY",
          creditsTotal: 1000,
          creditsUsed: 0,
        },
      });
    }

    return NextResponse.json({
      id: user.id,
      clerkId: user.clerkId,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      plan: user.plan.toLowerCase(),
      creditsUsed: user.creditsUsed,
      creditsTotal: user.creditsTotal,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error("[API] GET /api/user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
