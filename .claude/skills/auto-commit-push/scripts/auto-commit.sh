#!/usr/bin/env bash
# auto-commit.sh — run a single tick of the auto-commit pipeline.
#
# Stages all changes, generates a detailed commit message via build-message.js,
# commits, and pushes to the configured remote/branch.
#
# Configuration lives in environment variables with sane defaults.
set -u  # no -e: keep running on transient network errors

# ---------- Configuration -----------------------------------------------------
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_DIR="${AUTO_COMMIT_REPO_DIR:-/Users/priyanshu/Documents/geoagent-emegency-project}"
BRANCH="${AUTO_COMMIT_BRANCH:-main}"
REMOTE="${AUTO_COMMIT_REMOTE:-origin}"
LOG_FILE="${AUTO_COMMIT_LOG_FILE:-$SKILL_DIR/assets/auto-commit.log}"
TICK_FILE="${AUTO_COMMIT_TICK_FILE:-$SKILL_DIR/assets/tick.counter}"

mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$(dirname "$TICK_FILE")"

# ---------- Helpers -----------------------------------------------------------
log() {
  local ts
  ts="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  printf '[%s] %s\n' "$ts" "$*" | tee -a "$LOG_FILE"
}

# ---------- Pre-flight --------------------------------------------------------
if [[ ! -d "$REPO_DIR/.git" ]]; then
  log "ERROR: $REPO_DIR is not a git repository."
  exit 1
fi

TICK=0
if [[ -f "$TICK_FILE" ]]; then
  TICK="$(cat "$TICK_FILE" 2>/dev/null || echo 0)"
fi
TICK=$((TICK + 1))
echo "$TICK" > "$TICK_FILE"

cd "$REPO_DIR" || exit 1
export GIT_TERMINAL_PROMPT=0

# ---------- 1. Detect changes -------------------------------------------------
PORCELAIN="$(git status --porcelain --untracked-files=all 2>>"$LOG_FILE")"

if [[ -z "$PORCELAIN" ]]; then
  log "tick #$TICK — no changes, sleeping."
  exit 0
fi

CHANGED_COUNT="$(printf '%s\n' "$PORCELAIN" | wc -l | tr -d ' ')"
log "tick #$TICK — detected $CHANGED_COUNT changed file(s):"
printf '%s\n' "$PORCELAIN" | head -20 | sed 's/^/    /' >> "$LOG_FILE"
if [[ "$CHANGED_COUNT" -gt 20 ]]; then
  log "    ... and $((CHANGED_COUNT - 20)) more"
fi

# ---------- 2. Stage everything ----------------------------------------------
git add -A 2>>"$LOG_FILE" || {
  log "ERROR: git add failed"
  exit 1
}

STAGED_DIFF="$(git diff --cached --stat 2>>"$LOG_FILE")"
if [[ -z "$STAGED_DIFF" ]]; then
  log "tick #$TICK — nothing staged after add (all ignored), skipping."
  exit 0
fi

# ---------- 3. Build the detailed commit message ------------------------------
MSG_FILE="$(mktemp -t auto-commit-msg.XXXXXX)"
trap 'rm -f "$MSG_FILE"' EXIT

if ! node "$SKILL_DIR/scripts/build-message.js" "$REPO_DIR" "$TICK" > "$MSG_FILE" 2>>"$LOG_FILE"; then
  log "ERROR: build-message.js failed, falling back to generic message."
  {
    printf 'chore: auto-commit (tick #%s)\n\n' "$TICK"
    printf 'Auto-generated commit. Working tree had pending changes.\n'
    printf 'Tick: %s | Timestamp: %s\n' "$TICK" "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  } > "$MSG_FILE"
fi

# Show the message we're about to commit
log "Commit message preview:"
head -5 "$MSG_FILE" | sed 's/^/    /' >> "$LOG_FILE"

# ---------- 4. Commit ---------------------------------------------------------
FILE_COUNT="$(printf '%s' "$STAGED_DIFF" | grep '|' | wc -l | tr -d ' ')"
log "tick #$TICK — committing $FILE_COUNT file(s)..."

COMMIT_OUT="$(git commit -F "$MSG_FILE" 2>&1)"
COMMIT_RC=$?
printf '%s\n' "$COMMIT_OUT" >> "$LOG_FILE"

if [[ $COMMIT_RC -ne 0 ]]; then
  if printf '%s' "$COMMIT_OUT" | grep -q "nothing to commit"; then
    log "tick #$TICK — nothing to commit (race condition)."
    exit 0
  fi
  log "ERROR: git commit failed (rc=$COMMIT_RC)"
  exit "$COMMIT_RC"
fi

# ---------- 5. Push ------------------------------------------------------------
log "tick #$TICK — pushing to $REMOTE/$BRANCH ..."
PUSH_OUT="$(git push "$REMOTE" "$BRANCH" 2>&1)"
PUSH_RC=$?
printf '%s\n' "$PUSH_OUT" >> "$LOG_FILE"

if [[ $PUSH_RC -ne 0 ]]; then
  log "ERROR: git push failed (rc=$PUSH_RC). Will retry next tick."
  exit "$PUSH_RC"
fi

log "tick #$TICK — push OK."
exit 0
