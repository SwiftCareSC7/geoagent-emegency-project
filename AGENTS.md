<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## SwiftCare engineering methodology — Ponytail FULL (default)

All coding agents working in this repo use Ponytail FULL as the default methodology.
Skill: `.agents/skills/ponytail/SKILL.md` (mirror: `.claude/skills/ponytail/SKILL.md`).

```text
UNDERSTAND → MAKE THE SMALLEST COMPLETE CHANGE → VERIFY → STOP
```

Rules: inspect before changing; reuse before creating; smallest complete change;
fix root causes; no unnecessary abstraction or dependencies; preserve working
architecture (Next.js / Express / MongoDB / Socket.IO / Leaflet / Decision Engine);
verify meaningful changes (`tsc --noEmit`, targeted tests); security and
accessibility are never skipped; stop when the task is complete.
Commands (skill-capable hosts): `/ponytail [lite|full|ultra|off]`, `/ponytail-review`,
`/ponytail-audit`, `/ponytail-debt`. See `AI_TOOLKIT.md` for skills, tools, and when to use them.
