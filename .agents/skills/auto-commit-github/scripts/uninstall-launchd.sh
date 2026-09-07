#!/usr/bin/env bash
# uninstall-launchd.sh — stop and remove the auto-commit launchd job.

set -euo pipefail

PLIST_DST="$HOME/Library/LaunchAgents/com.user.auto-commit.plist"

if launchctl list 2>/dev/null | grep -q "com.user.auto-commit"; then
  launchctl bootout gui/"$UID" "$PLIST_DST" 2>/dev/null || \
  launchctl unload "$PLIST_DST" 2>/dev/null || \
  true
  echo "Stopped com.user.auto-commit."
else
  echo "com.user.auto-commit was not running."
fi

if [[ -f "$PLIST_DST" ]]; then
  rm -f "$PLIST_DST"
  echo "Removed $PLIST_DST."
fi

echo "Done."