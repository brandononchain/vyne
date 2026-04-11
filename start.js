#!/usr/bin/env node

/**
 * ── Vyne Unified Start Script ───────────────────────────────────────
 *
 * Single entrypoint for Railway. Starts the Next.js HTTP server
 * and optionally the BullMQ worker if REDIS_URL is configured.
 *
 * Usage:
 *   node start.js          (production)
 *   npx tsx start.ts       (also works)
 */

const { execSync, spawn } = require("child_process");
const path = require("path");

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

// ── Run Prisma migrations before starting ────────────────────────────
// This ensures the DB schema is always up to date on every deploy.
// `prisma db push` is idempotent — safe to run repeatedly.
try {
  console.log("[Vyne] Running prisma db push...");
  execSync("npx prisma db push", {
    stdio: "inherit",
    env: { ...process.env },
    timeout: 30000,
  });
  console.log("[Vyne] ✅ Database schema is up to date.");
} catch (err) {
  console.error("[Vyne] ⚠️  prisma db push failed (non-fatal):", err.message);
  // Non-fatal: the app can still start with the existing schema
}

console.log(`[Vyne] Starting Next.js server on ${HOST}:${PORT}...`);

// Start Next.js
const nextBin = path.join(__dirname, "node_modules", ".bin", "next");
const nextProcess = spawn(nextBin, ["start", "-H", HOST, "-p", String(PORT)], {
  stdio: "inherit",
  env: { ...process.env },
});

nextProcess.on("error", (err) => {
  console.error("[Vyne] Failed to start Next.js:", err.message);
  process.exit(1);
});

nextProcess.on("exit", (code) => {
  console.log(`[Vyne] Next.js exited with code ${code}`);
  process.exit(code || 0);
});

// ── Start BullMQ Worker (if Redis available) ─────────────────────────
// This runs the background job processor that executes deployed workflows
// autonomously — no user needs to be logged in.

let workerProcess = null;

if (process.env.REDIS_URL) {
  console.log("[Vyne] 🔄 REDIS_URL detected — starting background worker...");
  const tsxBin = path.join(__dirname, "node_modules", ".bin", "tsx");
  const workerPath = path.join(__dirname, "src", "lib", "server", "worker-standalone.js");

  // Check if standalone worker exists, fall back to tsx worker.ts
  const fs = require("fs");
  const workerFile = fs.existsSync(workerPath)
    ? workerPath
    : path.join(__dirname, "src", "lib", "server", "worker-entry.js");

  if (fs.existsSync(workerFile)) {
    workerProcess = spawn("node", [workerFile], {
      stdio: "inherit",
      env: { ...process.env },
    });

    workerProcess.on("error", (err) => {
      console.error("[Vyne] ⚠️ Worker failed to start:", err.message);
    });

    workerProcess.on("exit", (code) => {
      console.log(`[Vyne] Worker exited with code ${code}`);
    });
  } else {
    console.log("[Vyne] ⚠️ Worker file not found — background jobs disabled.");
    console.log("[Vyne]    Workflows can still be triggered via /api/workflows/trigger (sync mode).");
  }
} else {
  console.log("[Vyne] ℹ️  No REDIS_URL — background worker disabled.");
  console.log("[Vyne]    Workflows execute synchronously via /api/workflows/trigger.");
}

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("[Vyne] SIGTERM received, shutting down...");
  nextProcess.kill("SIGTERM");
  if (workerProcess) workerProcess.kill("SIGTERM");
});

process.on("SIGINT", () => {
  console.log("[Vyne] SIGINT received, shutting down...");
  nextProcess.kill("SIGINT");
  if (workerProcess) workerProcess.kill("SIGINT");
});
