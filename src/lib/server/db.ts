import { PrismaClient } from "@/generated/prisma/client";

// ── Prisma Client Singleton ──────────────────────────────────────────
//
// Prisma 7 requires an explicit connection configuration.
// For Railway PostgreSQL with a direct connection, pass the DATABASE_URL
// as the accelerateUrl parameter.

const globalForPrisma = globalThis as unknown as {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any;
};

function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it to your .env file or Railway environment variables."
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new (PrismaClient as any)({ accelerateUrl: url });
}

export const db: InstanceType<typeof PrismaClient> =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
