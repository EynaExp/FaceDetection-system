#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "=== Starting School Face Attendance System ==="

# Check if node is installed
if ! command -v node >/dev/null 2>&1; then
    echo "Error: Node.js is not installed. Please install Node.js v18+."
    exit 1
fi

# Install dependencies if node_modules missing
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install --omit=dev
fi

# Stop any running node instance on port 3000
NODE_PIDS=$(lsof -t -i :3000 2>/dev/null || true)
if [ -n "$NODE_PIDS" ]; then
    for p in $NODE_PIDS; do
        # Kill only node processes
        COMM=$(ps -p "$p" -o comm= 2>/dev/null || true)
        if [[ "$COMM" == *"node"* ]]; then
            echo "Stopping existing node instance (PID: $p)..."
            kill -9 "$p" 2>/dev/null || true
        fi
    done
fi

# Start application in background
echo "Starting application server..."
nohup node server.js > app.log 2>&1 &
SERVER_PID=$!
echo "$SERVER_PID" > .server.pid

sleep 1
if ps -p "$SERVER_PID" > /dev/null; then
    echo "✓ System successfully started!"
    echo "Access URL: http://localhost:3000"
    echo "Logs: $DIR/app.log"
else
    echo "Failed to start. Check app.log for details."
    cat app.log
    exit 1
fi
