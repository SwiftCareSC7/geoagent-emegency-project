#!/usr/bin/env bash
# stop.sh — stop the background auto-commit loop by PID.

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$SKILL_DIR/assets/loop.pid"

if [[ ! -f "$PID_FILE" ]]; then
  echo "No PID file found. Auto-commit loop is not running."
  exit 0
fi

PID="$(cat "$PID_FILE" 2>/dev/null)"
if [[ -z "$PID" ]]; then
  echo "PID file is empty. Cleaning up."
  rm -f "$PID_FILE"
  exit 0
fi

if kill -0 "$PID" 2>/dev/null; then
  echo "Stopping auto-commit loop (PID $PID)..."
  kill "$PID" 2>/dev/null
  # Wait briefly for graceful shutdown
  for i in $(seq 1 10); do
    if ! kill -0 "$PID" 2>/dev/null; then
      break
    fi
    sleep 0.5
  done
  # Force kill if still alive
  if kill -0 "$PID" 2>/dev/null; then
    kill -9 "$PID" 2>/dev/null
    echo "Force-killed PID $PID."
  else
    echo "Stopped gracefully."
  fi
else
  echo "Process $PID is not running. Cleaning up stale PID file."
fi

rm -f "$PID_FILE"
echo "Done."
