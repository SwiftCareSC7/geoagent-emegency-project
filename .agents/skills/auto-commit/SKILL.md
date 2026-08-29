---
name: auto-commit
description: Automatically commits all staged and unstaged changes to the local git repo every minute in the background. Use when the user asks for periodic auto-commits, background saves, or continuous git snapshots during a work session.
---

# Auto-Commit Skill

Automatically commit all changes to the git repository every minute.

## Behavior

1. **Stage everything**: `git add -A` (includes new, modified, and deleted files).
2. **Commit with a timestamp message**: `git commit -m "auto-commit: <ISO timestamp>"`.
3. **Skip if clean**: If there are no changes, do nothing (the commit will exit with code 1, which is fine).
4. **Recurrence**: Use the `schedule` tool with `CronExpression="*/1 * * * *"` and `IsDaemon=true` so the cron keeps running independently in the background.

## Prompt for the Cron

When the cron fires, run:

```bash
cd /Users/priyanshu/Documents/geoagent-emegency-project && git add -A && git commit -m "auto-commit: $(date -u +%Y-%m-%dT%H:%M:%SZ)" || true
```

The `|| true` ensures the job doesn't error when the working tree is clean.

## Notes

- This only commits locally — it does **not** push to a remote.
- To stop auto-commits, use the `manage_task` tool to kill the cron task.
- To also push, the user should explicitly ask for `&& git push` to be appended.
