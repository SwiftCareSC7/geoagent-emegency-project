#!/usr/bin/env bash
# auto-commit.sh — run a single tick of the auto-commit pipeline.
#
# Stages all changes in REPO_DIR, generates a detailed commit message,
# commits it (if there is anything to commit), and pushes to REMOTE:BRANCH.
#
# Configuration lives in the variables below — edit them to retarget.
#
# Companion scripts:
#   - auto-commit-loop.sh   -> calls this in a foreground while-true loop
#   - install-launchd.sh    -> runs this every 60s via macOS launchd
#   - build-message.js      -> builds the detailed commit message body

set -u  # do not -e: we want to keep running on transient network errors

# ---------- Configuration -----------------------------------------------------
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="${AUTO_COMMIT_REPO_DIR:-/Users/priyanshu/Documents/geoagent-emegency-project}"
BRANCH="${AUTO_COMMIT_BRANCH:-main}"
REMOTE="${AUTO_COMMIT_REMOTE:-origin}"
LOG_FILE="${AUTO_COMMIT_LOG_FILE:-$SKILL_DIR/../assets/auto-commit.log}"
TICK_FILE="${AUTO_COMMIT_TICK_FILE:-$SKILL_DIR/../assets/tick.counter}"

# Allow override via env so launchd plist can install a different path/branch.
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

# Tick counter (increments once per run; survives across calls via file).
TICK=0
if [[ -f "$TICK_FILE" ]]; then
  TICK="$(cat "$TICK_FILE" 2>/dev/null || echo 0)"
fi
TICK=$((TICK + 1))
echo "$TICK" > "$TICK_FILE"

cd "$REPO_DIR" || exit 1

# Quiet but capture git's stderr in our log.
export GIT_TERMINAL_PROMPT=0

# Wrap git so we always use the real binary with our env (avoids the
# `GIT_TERMINAL_PROMPT=0 git …` form which only works via `env`).
git() { command git "$@"; }

# ---------- 1. Detect changes -------------------------------------------------
# `git status --porcelain` is the source of truth for "anything to do".
PORCELAIN="$(git status --porcelain --untracked-files=all 2>>"$LOG_FILE")"

if [[ -z "$PORCELAIN" ]]; then
  log "tick #$TICK — no changes in $REPO_DIR, sleeping."
  exit 0
fi

# ---------- 2. Stage everything ----------------------------------------------
log "tick #$TICK — staging changes:"
printf '%s\n' "$PORCELAIN" | sed 's/^/    /' | tee -a "$LOG_FILE" >/dev/null

git add -A 2>>"$LOG_FILE" || {
  log "ERROR: git add failed"
  exit 1
}

# Make sure we actually have staged content (some files may be gitignored).
STAGED_DIFF="$(git diff --cached --stat 2>>"$LOG_FILE")"
if [[ -z "$STAGED_DIFF" ]]; then
  log "tick #$TICK — nothing staged after add (everything ignored?), skipping."
  exit 0
fi

# ---------- 3. Build the detailed commit message -------------------------------
MSG_FILE="$(mktemp -t auto-commit-msg.XXXXXX)"
trap 'rm -f "$MSG_FILE"' EXIT

if ! node "$SKILL_DIR/build-message.js" "$REPO_DIR" "$TICK" > "$MSG_FILE" 2>>"$LOG_FILE"; then
  log "ERROR: build-message.js failed; falling back to generic message."
  {
    printf 'chore: auto-commit (tick #%s)\n\n' "$TICK"
    printf 'Auto-generated commit because working tree had pending changes.\n'
    printf 'Tick: %s | Timestamp: %s\n' "$TICK" "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  } > "$MSG_FILE"
fi

# ---------- 4. Commit ---------------------------------------------------------
log "tick #$TICK — committing $(printf '%s' "$STAGED_DIFF" | wc -l | tr -d ' ') file(s)."
COMMIT_OUT="$(git commit -F "$MSG_FILE" 2>&1)"
COMMIT_RC=$?
printf '%s\n' "$COMMIT_OUT" >> "$LOG_FILE"

if [[ $COMMIT_RC -ne 0 ]]; then
  # 1 = nothing to commit (race with another process), treat as success.
  if printf '%s' "$COMMIT_OUT" | grep -q "nothing to commit"; then
    log "tick #$TICK — nothing to commit (race)."
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
  log "ERROR: git push failed (rc=$PUSH_RC). Will retry on next tick."
  exit "$PUSH_RC"
fi

log "tick #$TICK — push OK."
exit 0