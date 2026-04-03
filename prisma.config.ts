import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Fallback to a dummy URL during `prisma generate` on CI/Railway
    // where DATABASE_URL may not be available at build time.
    // The real URL is only needed at runtime (prisma db push / app start).
    url: process.env["DATABASE_URL"] || "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
});
