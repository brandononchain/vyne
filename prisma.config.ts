import { defineConfig } from "prisma/config";

// Only load dotenv if a .env file exists (not on Railway/CI where
// env vars are injected by the platform)
try {
  require("dotenv/config");
} catch {
  // No .env file — that's fine on Railway
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Fallback to a dummy URL during `prisma generate` on CI/Railway.
    // Generation only reads the schema — it doesn't connect to a database.
    url: process.env["DATABASE_URL"] || "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
});
