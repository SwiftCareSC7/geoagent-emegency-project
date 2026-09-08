#!/usr/bin/env bash
# auto-commit-loop.sh — foreground while-true loop.
# Calls auto-commit.sh every AUTO_COMMIT_INTERVAL seconds (default: 180 = 3 min).
# Press Ctrl+C to stop.

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INTERVAL="${AUTO_COMMIT_INTERVAL:-300}"
LOG_FILE="${AUTO_COMMIT_LOG_FILE:-$SKILL_DIR/assets/auto-commit.log}"

mkdir -p "$(dirname "$LOG_FILE")"

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] auto-commit-loop started (interval=${INTERVAL}s)"
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] PID: $$"
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Log: $LOG_FILE"
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Press Ctrl+C to stop"
echo ""

# Write PID for stop.sh
PID_FILE="$SKILL_DIR/assets/loop.pid"
echo "$$" > "$PID_FILE"

# Cleanup on exit
trap 'rm -f "$PID_FILE"; echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Loop stopped."; exit 0' INT TERM

while true; do
  bash "$SKILL_DIR/scripts/auto-commit.sh"
  EXIT_CODE=$?
  if [[ $EXIT_CODE -ne 0 ]]; then
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] auto-commit.sh exited with code $EXIT_CODE, retrying in ${INTERVAL}s..."
  fi
  sleep "$INTERVAL"
done
