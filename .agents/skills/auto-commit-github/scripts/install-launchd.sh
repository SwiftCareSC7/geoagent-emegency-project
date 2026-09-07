#!/usr/bin/env bash
# install-launchd.sh — install the auto-commit launchd job.
#
# Copies assets/com.user.auto-commit.plist into ~/Library/LaunchAgents and
# loads it with `launchctl bootstrap gui/$UID`. After this, macOS will run
# scripts/auto-commit.sh every 60 seconds for the current user.

set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLIST_SRC="$SKILL_DIR/../assets/com.user.auto-commit.plist"
PLIST_DST="$HOME/Library/LaunchAgents/com.user.auto-commit.plist"

if [[ ! -f "$PLIST_SRC" ]]; then
  echo "ERROR: missing $PLIST_SRC" >&2
  exit 1
fi

mkdir -p "$HOME/Library/LaunchAgents"

# Make sure scripts are executable.
chmod +x "$SKILL_DIR/auto-commit.sh" "$SKILL_DIR/auto-commit-loop.sh" "$SKILL_DIR/build-message.js"

# Copy the plist (we copy, not symlink, so macOS does not lose it on reboot).
cp "$PLIST_SRC" "$PLIST_DST"

# If a previous instance is loaded, unload it cleanly.
if launchctl list 2>/dev/null | grep -q "com.user.auto-commit"; then
  launchctl bootout gui/"$UID" "$PLIST_DST" 2>/dev/null || true
fi

# Load under the user's GUI domain so it can access ~/ and Keychain.
launchctl bootstrap gui/"$UID" "$PLIST_DST"

# Verify.
if launchctl list | grep -q "com.user.auto-commit"; then
  echo "auto-commit installed and running (label: com.user.auto-commit)."
  echo "Plist: $PLIST_DST"
  echo "Log:   $SKILL_DIR/../assets/auto-commit.out.log"
  echo ""
  echo "To stop: bash $SKILL_DIR/uninstall-launchd.sh"
else
  echo "ERROR: launchd did not pick up the job. Try:"
  echo "  launchctl load -w $PLIST_DST"
  exit 1
fi