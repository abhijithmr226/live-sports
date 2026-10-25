#!/bin/sh
echo "=== CloudCast OBS Studio: Starting Unified Production Services on Render ==="

# Set Render assigned port for web ingress
PORT=${PORT:-3000}
export BACKEND_URL=http://127.0.0.1:4000

# Start Backend API & FFmpeg Streaming Engine
echo "Starting Backend Streaming Worker on internal port 4000..."
PORT=4000 node backend/dist/index.js &
BACKEND_PID=$!

# Brief pause for backend database initialization
sleep 2

# Start Next.js OBS Studio frontend binding to Render's $PORT
echo "Starting Next.js OBS Studio Interface on public port $PORT..."
npx next start frontend -p $PORT &
FRONTEND_PID=$!

# Wait for both processes
trap "kill -TERM $BACKEND_PID $FRONTEND_PID" INT TERM
wait
