---
name: auto-commit-push
description: Auto-commit and push local changes to GitHub every 3 minutes with detailed, human-readable commit messages. Use this skill whenever the user wants automatic background commits to GitHub (e.g. "commit every 3 min", "auto push to github", "watch and commit", "background sync to git", "keep pushing my changes"). Produces Conventional Commit-style messages that describe WHAT changed, WHERE, and WHY — not just "auto commit". Targets the GeoAgent Emergency project repo by default but works for any git repo with a remote. Trigger on phrases like "auto commit", "push automatically", "commit every few minutes", "background git", "keep repo in sync", "auto push".
---

# Auto-Commit & Push to GitHub (Every 3 Minutes)

This skill keeps your local repository continuously synced with GitHub by:

1. Polling the working tree every **3 minutes** (180 seconds).
2. Detecting any tracked or untracked changes.
3. Auto-staging, auto-committing with a **detailed multi-line message**, and pushing to the configured remote.
4. Generating commit messages that describe **what changed, where it changed, and the significance** of the change.

Default target: `https://github.com/SwiftCareSC7/geoagent-emegency-project.git` on `main` branch.

## When to use

- User says "commit every 3 min", "auto commit", "push to github automatically", "watch and commit", "background git sync"
- User wants a background process that continuously mirrors local edits to a remote
- User wants detailed, human-friendly commit messages (not just "auto commit")

## When NOT to use

- One-off manual commits (just use `git commit` directly)
- Repositories where auto-commits are forbidden by branch protection rules
- CI/CD pipelines that already handle auto-commits

---

## Quick Start

All commands assume the project root `/Users/priyanshu/Documents/geoagent-emegency-project`.

### 1. Verify git remote

```bash
git -C /Users/priyanshu/Documents/geoagent-emegency-project remote -v
```

If missing or wrong:
```bash
git -C /Users/priyanshu/Documents/geoagent-emegency-project \
  remote set-url origin https://github.com/SwiftCareSC7/geoagent-emegency-project.git
```

### 2. Make scripts executable

```bash
chmod +x /Users/priyanshu/Documents/geoagent-emegency-project/.claude/skills/auto-commit-push/scripts/*.sh
chmod +x /Users/priyanshu/Documents/geoagent-emegency-project/.claude/skills/auto-commit-push/scripts/*.js
```

### 3. Start the auto-commit loop

**Background mode** (recommended — runs in background, survives terminal close):
```bash
/Users/priyanshu/Documents/geoagent-emegency-project/.claude/skills/auto-commit-push/scripts/start.sh
```

**Foreground mode** (useful for debugging — prints logs to terminal):
```bash
/Users/priyanshu/Documents/geoagent-emegency-project/.claude/skills/auto-commit-push/scripts/auto-commit-loop.sh
```

### 4. Stop the auto-commit loop

```bash
/Users/priyanshu/Documents/geoagent-emegency-project/.claude/skills/auto-commit-push/scripts/stop.sh
```

### 5. Check status

```bash
# View recent commits
git -C /Users/priyanshu/Documents/geoagent-emegency-project log --oneline -10

# View auto-commit log
cat /Users/priyanshu/Documents/geoagent-emegency-project/.claude/skills/auto-commit-push/assets/auto-commit.log

# Check if loop is running
cat /Users/priyanshu/Documents/geoagent-emegency-project/.claude/skills/auto-commit-push/assets/loop.pid
```

---

## How It Works

```
                   every 180s (3 min)
       ┌────────────────────────────────┐
       ▼                                │
  start.sh / auto-commit-loop.sh        │
       │                                │
       ▼                                │
  scripts/auto-commit.sh                │
       │                                │
       ├─► git status --porcelain       │
       ├─► git add -A                   │
       ├─► git diff --cached --stat     │
       ├─► node build-message.js        │──► generates detailed message
       │      (analyzes diff hunks,     │    (identifies components,
       │       extracts identifiers,    │     functions, files, intent)
       │       infers intent)           │
       ├─► git commit -m "..."         │
       └─► git push origin <branch>    │
                                        │
       on failure: log error + retry next tick
```

---

## Commit Message Format

The skill generates **Conventional Commits** with a detailed body:

```
<type>(<scope>): <subject>

<body describing what changed and why>

<footer with stats>
```

### Example output:

```
feat(dashboard): add real-time fleet status panel with live vehicle tracking

Added FleetPanel component that subscribes to Socket.IO room 'control-room'
for live vehicle position updates. Uses useRealtimeEmergency hook to track
emergency status changes with 30s freshness threshold.

- components/dashboard/fleet-panel.tsx: new component with vehicle grid
- components/dashboard/driver-dashboard.tsx: integrated FleetPanel
- lib/socket/client.ts: added 'control-room' room subscription
- lib/api/types.ts: added Vehicle interface with GPS fields

Stats: 4 files changed, +342 lines, -28 lines | tick #47
```

---

## Configuration

Environment variables (all optional, have defaults):

| Variable | Default | Description |
|---|---|---|
| `AUTO_COMMIT_REPO_DIR` | `/Users/priyanshu/Documents/geoagent-emegency-project` | Repository root |
| `AUTO_COMMIT_BRANCH` | `main` | Branch to push to |
| `AUTO_COMMIT_REMOTE` | `origin` | Remote name |
| `AUTO_COMMIT_INTERVAL` | `180` | Seconds between ticks |
| `AUTO_COMMIT_LOG_FILE` | `assets/auto-commit.log` | Log file path |
| `AUTO_COMMIT_MAX_DIFF_KB` | `50` | Max diff size to analyze |

---

## File Structure

```
.claude/skills/auto-commit-push/
├── SKILL.md                    # This file
├── scripts/
│   ├── auto-commit.sh          # Single-tick commit script (stages, commits, pushes)
│   ├── auto-commit-loop.sh     # Foreground while-true loop (calls auto-commit.sh)
│   ├── build-message.js        # Node.js diff analyzer for detailed commit messages
│   ├── start.sh                # Launch background loop (writes PID file)
│   └── stop.sh                 # Kill background loop by PID
└── assets/
    ├── auto-commit.log         # Log output (auto-created)
    ├── tick.counter            # Tick counter (auto-created)
    └── loop.pid                # PID of background loop (auto-created)
```
