// ── Prisma Client Singleton ──────────────────────────────────────────
// Uses dynamic require() so Turbopack doesn't resolve the generated
// Prisma client at build time (which fails if it doesn't exist yet).
// The actual import only happens at runtime when an API route calls db.
//
// Prisma 7 requires either `accelerateUrl` (for Prisma Accelerate) or
// a driver `adapter` (for direct PostgreSQL). Railway provides a direct
// connection, so we use @prisma/adapter-pg.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalForPrisma = globalThis as unknown as { prisma: any };

function getClient() {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  // Dynamic requires — invisible to Turbopack's static analysis
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaPg } = require("@prisma/adapter-pg");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("@/generated/prisma/client");

  const adapter = new PrismaPg(url);
  const client = new mod.PrismaClient({ adapter });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }

  return client;
}

// Lazy proxy — defers all property access to runtime
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db: any = new Proxy({} as any, {
  get(_target, prop) {
    return getClient()[prop];
  },
});
