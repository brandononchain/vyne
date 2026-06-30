#!/bin/sh
# ── Vyne startup ────────────────────────────────────────────────────
# Applies the database schema, then starts the server. The BullMQ worker
# is started in-process by src/instrumentation.ts.
#
# Schema strategy:
#   - If committed migrations exist (prisma/migrations/*), use the
#     production-safe `prisma migrate deploy`.
#   - Otherwise fall back to `prisma db push` (current default).
# To adopt migrations, run `npx prisma migrate dev --name init` against a
# dev database once and commit the generated prisma/migrations directory.

PRISMA="node node_modules/prisma/build/index.js"

if [ -d "prisma/migrations" ] && [ -n "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  echo "[Vyne] Applying migrations (prisma migrate deploy)..."
  $PRISMA migrate deploy || {
    echo "[Vyne] migrate deploy failed — falling back to db push"
    $PRISMA db push || echo "[Vyne] DB sync skipped"
  }
else
  echo "[Vyne] No migrations found — syncing schema with db push..."
  $PRISMA db push || echo "[Vyne] DB push skipped"
fi

echo "[Vyne] Starting server..."
exec node server.js
