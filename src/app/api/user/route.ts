import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/server/db";

export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let user = await db.user.findUnique({
      where: { clerkId },
      include: { organization: true },
    });

    // Auto-create user + org on first visit
    if (!user) {
      const clerkUser = await currentUser();
      const email = clerkUser?.emailAddresses?.[0]?.emailAddress || `${clerkId}@vyne.ai`;
      const name = clerkUser ? [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null : null;
      const slug = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "-");

      const org = await db.organization.create({
        data: {
          name: name ? `${name}'s Workspace` : "My Workspace",
          slug: `${slug}-${Date.now().toString(36)}`,
          plan: "HOBBY",
          creditsTotal: 1000,
        },
      });

      user = await db.user.create({
        data: {
          clerkId,
          email,
          name,
          avatarUrl: clerkUser?.imageUrl || null,
          plan: "HOBBY",
          creditsTotal: 1000,
          creditsUsed: 0,
          organizationId: org.id,
          orgRole: "OWNER",
        },
        include: { organization: true },
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
      orgRole: user.orgRole.toLowerCase(),
      createdAt: user.createdAt,
      organization: user.organization ? {
        id: user.organization.id,
        name: user.organization.name,
        slug: user.organization.slug,
        plan: user.organization.plan.toLowerCase(),
        creditsUsed: user.organization.creditsUsed,
        creditsTotal: user.organization.creditsTotal,
      } : null,
    });
  } catch (error) {
    console.error("[API] GET /api/user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
