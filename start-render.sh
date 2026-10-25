#!/bin/sh
set -e

echo "=== CloudCast OBS Studio: Starting Unified Production Services on Render ==="

# Set Render assigned port for web ingress
PORT=${PORT:-3000}
export BACKEND_URL="http://127.0.0.1:4000"

# Start Backend API & FFmpeg Streaming Engine on internal port 4000
echo "Starting Backend Streaming Worker on internal port 4000..."
(cd /app && PORT=4000 node backend/dist/index.js) &
BACKEND_PID=$!

# Brief pause for backend database initialization
sleep 2

# Start Next.js OBS Studio frontend binding to Render's public $PORT
echo "Starting Next.js OBS Studio Interface on public port $PORT..."
(cd /app/frontend && npx next start -p "$PORT") &
FRONTEND_PID=$!

# Continuous Autonomous Anti-Sleep Engine:
# Pings the public Render gateway every 5 minutes to permanently prevent instance idling
(
  while true; do
    sleep 300
    TARGET_URL="${RENDER_EXTERNAL_URL:-http://127.0.0.1:$PORT}"
    echo "[Anti-Sleep Engine] Dispatched public keepalive ping to $TARGET_URL/api/health"
    curl -s -f -m 15 "$TARGET_URL/api/health" >/dev/null 2>&1 || true
  done
) &
PINGER_PID=$!

# Handle shutdown signals gracefully
trap "kill -TERM $BACKEND_PID $FRONTEND_PID $PINGER_PID 2>/dev/null || true" INT TERM
wait
