#!/bin/bash
# Auto-push script - runs every 5 minutes
# WARNING: This will commit ALL changes including untracked files

cd /Users/priyanshu/Documents/geoagent-emegency-project

while true; do
    # Check if there are any changes
    if ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git ls-files --others --exclude-standard)" ]; then
        echo "[$(date)] Changes detected, committing and pushing..."
        git add -A
        git commit -m "Auto-commit: $(date '+%Y-%m-%d %H:%M:%S')" || true
        git push origin main || true
    else
        echo "[$(date)] No changes, skipping..."
    fi
    sleep 60  # 1 minute = 60 seconds
done