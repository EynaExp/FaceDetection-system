#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "=== Stopping School Face Attendance System ==="

STOPPED=0

# Stop by saved PID
if [ -f ".server.pid" ]; then
    PID=$(cat .server.pid 2>/dev/null || true)
    if [ -n "$PID" ] && ps -p "$PID" > /dev/null 2>&1; then
        echo "Killing process PID: $PID"
        kill -15 "$PID" 2>/dev/null || kill -9 "$PID" 2>/dev/null || true
        STOPPED=1
    fi
    rm -f .server.pid
fi

# Stop by port 3000 if still bound
PORT_PIDS=$(lsof -t -i :3000 2>/dev/null || true)
if [ -n "$PORT_PIDS" ]; then
    for p in $PORT_PIDS; do
        COMM=$(ps -p "$p" -o comm= 2>/dev/null || true)
        if [[ "$COMM" == *"node"* ]]; then
            echo "Killing node process on port 3000 (PID: $p)..."
            kill -9 "$p" 2>/dev/null || true
            STOPPED=1
        fi
    done
fi

if [ "$STOPPED" -eq 1 ]; then
    echo "✓ System stopped."
else
    echo "No running system instance found."
fi
