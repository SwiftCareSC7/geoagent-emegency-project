#!/usr/bin/env bash
# start.sh — launch the auto-commit loop in the background.
# Writes PID to assets/loop.pid for stop.sh to kill later.

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$SKILL_DIR/assets/loop.pid"
LOG_FILE="${AUTO_COMMIT_LOG_FILE:-$SKILL_DIR/assets/auto-commit.log}"

mkdir -p "$(dirname "$PID_FILE")"
mkdir -p "$(dirname "$LOG_FILE")"

# Check if already running
if [[ -f "$PID_FILE" ]]; then
  OLD_PID="$(cat "$PID_FILE" 2>/dev/null)"
  if [[ -n "$OLD_PID" ]] && kill -0 "$OLD_PID" 2>/dev/null; then
    echo "Auto-commit loop already running (PID $OLD_PID)."
    echo "Stop it first with: stop.sh"
    exit 1
  fi
  rm -f "$PID_FILE"
fi

# Launch in background, detached from terminal
nohup bash "$SKILL_DIR/scripts/auto-commit-loop.sh" >> "$LOG_FILE" 2>&1 &
NEW_PID=$!
echo "$NEW_PID" > "$PID_FILE"

echo "Auto-commit loop started in background (PID $NEW_PID)."
echo "Interval: ${AUTO_COMMIT_INTERVAL:-180}s (3 min)"
echo "Log: $LOG_FILE"
echo "Stop with: stop.sh"
