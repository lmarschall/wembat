#!/usr/bin/env bash
# Starts the local dev environment: docker compose stack, Prisma Studio, and the demo app.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -f "$ROOT_DIR/.env" ]; then
  echo "No .env file found in $ROOT_DIR - run install.sh first or copy .env.template to .env."
  exit 1
fi

PRISMA_PID=""
DEMO_PID=""

cleanup() {
  echo ""
  echo "Shutting down dev environment..."
  [ -n "$PRISMA_PID" ] && kill "$PRISMA_PID" 2>/dev/null || true
  [ -n "$DEMO_PID" ] && kill "$DEMO_PID" 2>/dev/null || true
  docker compose -f "$ROOT_DIR/docker-compose.yml" down
}
trap cleanup EXIT INT TERM

echo "Starting docker compose stack..."
docker compose -f "$ROOT_DIR/docker-compose.yml" up -d

echo "Starting Prisma Studio (workspaces/server)..."
(cd "$ROOT_DIR/workspaces/server" && npx prisma studio) &
PRISMA_PID=$!

echo "Starting demo dev server (workspaces/demo)..."
(cd "$ROOT_DIR/workspaces/demo" && npm run dev) &
DEMO_PID=$!

wait "$PRISMA_PID" "$DEMO_PID"
