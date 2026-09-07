#!/usr/bin/env bash
# auto-commit-loop.sh — run auto-commit.sh in a foreground loop every 60 seconds.
#
# Use this when you do not want (or cannot use) launchd. Example:
#   bash scripts/auto-commit-loop.sh
#
# Press Ctrl-C to stop. Logs go to assets/auto-commit.log.

set -u

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INTERVAL="${AUTO_COMMIT_INTERVAL:-60}"

mkdir -p "$SKILL_DIR/../assets"

echo "Starting auto-commit loop (interval=${INTERVAL}s, repo=$AUTO_COMMIT_REPO_DIR)."
echo "Press Ctrl-C to stop."

while true; do
  bash "$SKILL_DIR/auto-commit.sh" || true
  sleep "$INTERVAL"
done