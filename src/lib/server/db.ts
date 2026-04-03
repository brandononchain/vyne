import { PrismaClient } from "@/generated/prisma/client";

// ── Prisma Client Singleton ──────────────────────────────────────────
// Lazy initialization — only connects when first accessed at RUNTIME,
// not during Next.js build/SSG which would fail without a database.

const globalForPrisma = globalThis as unknown as {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any;
};

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new (PrismaClient as any)({ accelerateUrl: url });
}

// Lazy getter — the client is only created when `db` is first used
// in an API route or server action, never during build.
export const db: InstanceType<typeof PrismaClient> = new Proxy(
  {} as InstanceType<typeof PrismaClient>,
  {
    get(_target, prop) {
      if (!globalForPrisma.prisma) {
        globalForPrisma.prisma = createClient();
      }
      return (globalForPrisma.prisma as Record<string | symbol, unknown>)[prop];
    },
  }
);
