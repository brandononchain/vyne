import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";

// ── Clerk Webhook Handler ────────────────────────────────────────────

interface ClerkWebhookEvent {
  type: string;
  data: {
    id: string;
    email_addresses: { email_address: string }[];
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ClerkWebhookEvent;
    const { type, data } = body;

    const primaryEmail = data.email_addresses?.[0]?.email_address;
    const fullName = [data.first_name, data.last_name].filter(Boolean).join(" ") || null;

    switch (type) {
      case "user.created": {
        if (!primaryEmail) {
          return NextResponse.json({ error: "No email" }, { status: 400 });
        }

        // Create a default organization for the user
        const slug = primaryEmail.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "-");
        const org = await db.organization.create({
          data: {
            name: fullName ? `${fullName}'s Workspace` : "My Workspace",
            slug: `${slug}-${Date.now().toString(36)}`,
            plan: "HOBBY",
            creditsTotal: 1000,
          },
        });

        await db.user.create({
          data: {
            clerkId: data.id,
            email: primaryEmail,
            name: fullName,
            avatarUrl: data.image_url,
            plan: "HOBBY",
            creditsTotal: 1000,
            creditsUsed: 0,
            organizationId: org.id,
            orgRole: "OWNER",
          },
        });

        console.log(`[Clerk] Created user ${data.id} + org ${org.id}`);
        break;
      }

      case "user.updated": {
        await db.user.update({
          where: { clerkId: data.id },
          data: {
            email: primaryEmail || undefined,
            name: fullName,
            avatarUrl: data.image_url,
          },
        });
        console.log(`[Clerk] Updated user ${data.id}`);
        break;
      }

      case "user.deleted": {
        const user = await db.user.findUnique({ where: { clerkId: data.id } });
        if (user) {
          // Delete org if this user was the only owner
          if (user.organizationId) {
            const orgMembers = await db.user.count({ where: { organizationId: user.organizationId } });
            if (orgMembers <= 1) {
              await db.organization.delete({ where: { id: user.organizationId } }).catch(() => {});
            }
          }
          await db.user.delete({ where: { clerkId: data.id } }).catch(() => {});
        }
        console.log(`[Clerk] Deleted user ${data.id}`);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Clerk Webhook] Error:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
