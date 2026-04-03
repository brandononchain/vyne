import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";

// ── Clerk Webhook Handler ────────────────────────────────────────────
//
// Syncs Clerk user events with the Prisma User table.
// Configure this endpoint in your Clerk Dashboard → Webhooks:
//   URL: https://your-domain.com/api/webhooks/clerk
//   Events: user.created, user.updated, user.deleted
//
// In production, you MUST verify the webhook signature using
// the Clerk webhook secret (svix). This skeleton shows the
// data flow without signature verification for clarity.

interface ClerkWebhookEvent {
  type: string;
  data: {
    id: string;
    email_addresses: { email_address: string; id: string }[];
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
    const fullName = [data.first_name, data.last_name]
      .filter(Boolean)
      .join(" ") || null;

    switch (type) {
      case "user.created": {
        if (!primaryEmail) {
          return NextResponse.json(
            { error: "No email on user" },
            { status: 400 }
          );
        }

        await db.user.create({
          data: {
            clerkId: data.id,
            email: primaryEmail,
            name: fullName,
            avatarUrl: data.image_url,
            plan: "HOBBY",
            creditsTotal: 1000,
            creditsUsed: 0,
          },
        });

        console.log(`[Clerk Webhook] Created user ${data.id} (${primaryEmail})`);
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

        console.log(`[Clerk Webhook] Updated user ${data.id}`);
        break;
      }

      case "user.deleted": {
        await db.user
          .delete({ where: { clerkId: data.id } })
          .catch(() => {
            // User may already be deleted — that's fine
          });

        console.log(`[Clerk Webhook] Deleted user ${data.id}`);
        break;
      }

      default:
        console.log(`[Clerk Webhook] Unhandled event: ${type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Clerk Webhook] Error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
