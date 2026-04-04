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

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("[Vyne] SIGTERM received, shutting down...");
  nextProcess.kill("SIGTERM");
});

process.on("SIGINT", () => {
  console.log("[Vyne] SIGINT received, shutting down...");
  nextProcess.kill("SIGINT");
});
