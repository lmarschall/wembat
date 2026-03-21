#!/usr/bin/bash
# Exit immediately if a command exits with a non-zero status
set -e

# Deploy migrations
echo "Applying Prisma migrations..."
# npx prisma migrate deploy

# Key Management
KEYS_DIR="/opt/data/keys"
PRIVATE_KEY="$KEYS_DIR/privateKey.pem"
PUBLIC_KEY="$KEYS_DIR/publicKey.pem"

if [ ! -d "$KEYS_DIR" ]; then
  mkdir -p "$KEYS_DIR"
fi

if [ ! -f "$PRIVATE_KEY" ]; then
  echo "Generating new EC keys..."
  openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:prime256v1 -out "$PRIVATE_KEY"
  openssl ec -in "$PRIVATE_KEY" -pubout -out "$PUBLIC_KEY"
  echo "Keys created."
else
  echo "Existing keys found, skipping generation."
fi

echo "--- Starting API Server ---"

# Use 'exec' so Node becomes PID 1 and handles SIGTERM/SIGINT properly
node dist/src/app.js || echo "App crashed! Stalling so you can debug..."

# Keep alive even after crash
tail -f /dev/null