# launchd Notes for the Auto-Commit Skill

Background about macOS `launchd` so the skill's installer behaves predictably.

## Why `launchd` and not `cron`?

- `cron` is deprecated on macOS and skipped when the Mac is asleep (a laptop lid close stops it). It also has no easy way to give per-job logs.
- `launchd` jobs under `gui/<uid>` run as the logged-in user, can access the Keychain (for `git credential-osxkeychain`), and can log to a file.
- `StartInterval` of 60 means "60 seconds between launches", not "every minute on the wall clock". If the Mac sleeps, the counter pauses; the next launch happens 60s after wake.

## The `gui/<uid>` domain

We `launchctl bootstrap gui/$UID <plist>` rather than `launchctl load <plist>`. The modern `bootstrap` API:

- Loads the plist into the per-user GUI domain, so it has access to the user's session (keychain, env, etc.).
- Does not require sudo.
- Plays nicely with the `bootout` API for clean uninstall.

If you ever see "bootstrap failed", the older `launchctl load -w` form still works as a fallback (the installer tries it on failure).

## `StartInterval` vs `StartCalendarInterval`

We use `StartInterval`. Alternatives:

- `StartCalendarInterval` with `Minute: *` would run on the wall clock minute. Useful if you want exact "every minute on the minute", but it can stack up if the previous tick is still running. We avoid that.
- `KeepAlive: true` would relaunch the script forever, even after it exits. We deliberately set `KeepAlive: false` so transient errors don't cause a tight loop.

## macOS Gatekeeper / unsigned plists

A plain text plist in `~/Library/LaunchAgents/` is not code, so it does not need to be signed. macOS will load it without prompting.

## Verifying the job

```bash
launchctl list | grep auto-commit
# Expect:  PID  Status  Label
#          <id> 0      com.user.auto-commit
```

PID `-` means "waiting for next interval". A number means it is currently running.

## Common failure modes

| Symptom                                                | Cause                                    | Fix                                                  |
|--------------------------------------------------------|------------------------------------------|------------------------------------------------------|
| `launchctl bootstrap` returns "already bootstrapped"  | Old version still loaded                 | `launchctl bootout gui/$UID <plist>` first           |
| Job loads but never runs                               | Mac is asleep / lid closed               | Wake the Mac; `StartInterval` does not run during sleep |
| `git push` fails with "could not read Username"        | HTTPS remote without credential helper   | Use `git credential-osxkeychain` or embed a PAT in the remote URL |
| Job runs but logs are empty                             | `StandardOutPath` directory missing      | Installer creates `assets/`; ensure path is writable |

## Re-running the daemon manually

If you do not want a background launchd job, run:

```bash
bash scripts/auto-commit-loop.sh
```

This is a foreground bash loop with `sleep 60`. Stop with Ctrl-C.

## Uninstalling cleanly

```bash
bash scripts/uninstall-launchd.sh
```

This:

1. `bootout` the job from `gui/$UID`.
2. Removes the plist from `~/Library/LaunchAgents/`.

The job is fully gone after this. Logs in `assets/auto-commit*.log` are kept.