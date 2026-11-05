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
if command -v lsof >/dev/null 2>&1; then
    PORT_PID=$(lsof -t -i :3000 2>/dev/null || true)
    if [ -n "$PORT_PID" ]; then
        echo "Killing process on port 3000 (PID: $PORT_PID)..."
        kill -9 "$PORT_PID" 2>/dev/null || true
        STOPPED=1
    fi
fi

if [ "$STOPPED" -eq 1 ]; then
    echo "✓ System stopped."
else
    echo "No running system instance found."
fi
