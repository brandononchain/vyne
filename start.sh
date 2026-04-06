#!/bin/sh
echo "[Vyne] Pushing database schema..."
node node_modules/prisma/build/index.js db push --skip-generate 2>&1 || echo "[Vyne] DB push skipped"
echo "[Vyne] Starting server..."
exec node server.js
