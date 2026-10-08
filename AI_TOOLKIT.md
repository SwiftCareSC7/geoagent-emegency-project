# SwiftCare AI Toolkit — REAL STATUS

Default methodology: **Ponytail FULL** (`UNDERSTAND → SMALLEST COMPLETE CHANGE → VERIFY → STOP`).
Skill: `.agents/skills/ponytail/SKILL.md` (mirror `.claude/skills/ponytail/`).
Every supported agent that loads `AGENTS.md` follows it. External models are not controlled.

## Verification table

| Tool | Expected | Actual | Verified |
|---|---|---|---|
| Ponytail | Installed + configured | `.agents/skills/ponytail/SKILL.md` + `.claude/skills/ponytail/SKILL.md`, `AGENTS.md` default-FULL | YES |
| VibeSec | Installed + configured | `.agents/skills/vibesec/SKILL.md` + `.claude/skills/vibesec/SKILL.md` | YES |
| i-have-adhd | Installed + configured | ALREADY PRESENT `.agents/skills/i-have-adhd`, mirrored to `.claude/skills/i-have-adhd` | YES |
| Taste | Installed + configured | ALREADY PRESENT `taste-design` in both skill dirs (equivalent purpose) | YES |
| Impeccable | Installed | `npx impeccable install --providers=claude,codex --scope=project` → `.agents/.claude/skills/impeccable/` + engine v0.1.11; bins gitignored | YES |
| Spec Kit | Installed | `specify` 1.1.2 via `pipx install specify-cli` (`~/.local/bin/specify`) | YES |
| Ruflo | Installed | `ruflo` v3.55.0 via `npm install -g ruflo@latest` (dev machine only) | YES |
| is-website-vulnerable | Installed | `is-website-vulnerable` 1.14.17 via `npm install -g` (dev machine only) | YES |
| Strix | Installed | BLOCKED — official installer hung 180s (interactive/setup requirements); `strix` binary absent | NO |
| Google Stitch | Configured | ALREADY PRESENT — 8 `stitch-*` skills in both dirs; MCP runtime is per-developer external | YES (skills) |
| Shadcn | Configured | `components.json` (new-york, Tailwind v4, `@/` aliases) + `components/ui/` (button, modal, disclosure pre-existing; badge, table, skeleton, dialog, sheet, tabs, alert added via CLI); `cn` package rejected in favor of existing `@/lib/utils`; only new prod dep is `radix-ui` (primitives) | YES |
| awesome-shadcn-ui | Available as reference | REFERENCE ONLY — catalog (awesomeshadcn.dev) used for discovery; shortlist evaluated: `shadcn-map`, `approvals-ui`, `niko-table`/`adapttable`, `credenza` NOT vendored (map engine, decision flow, and tables stay on current Leaflet/custom implementation; revisit only with a concrete gap) | YES |
| Penpot | Installed or external | EXTERNAL SERVICE — Docker exists but full-stack local install out of scope; see `tools/LOCAL_SERVICES.md` | EXTERNAL |
| Plane | Installed or external | EXTERNAL SERVICE — same as Penpot; process-only, see `tools/LOCAL_SERVICES.md` | EXTERNAL |

## How each is invoked

- `/ponytail [lite|full|ultra|off]`, `/ponytail-review`, `/ponytail-audit`, `/ponytail-debt` (skill-capable hosts)
- `vibesec` — load skill for auth/RBAC/API/secrets/input-validation work
- `is-website-vulnerable http://localhost:3000` — manual pre-release check, not CI-gated
- `specify init <dir>` — large features only; never for small changes
- `ruflo --help` — external harness experiments only; never replaces app architecture
- `npx impeccable detect <target>` / `/impeccable <command>` — UI quality when relevant
- Stitch skills — design direction feeding `app/` + `components/` implementation

## Security boundary (never bypassed)

```text
OBSERVED → INFERRED/DERIVED → AI ADVISORY → DETERMINISTIC DECISION ENGINE → HUMAN APPROVAL → EXECUTION
```

No skill or tool is authoritative; none executes emergency actions.
Never commit secrets; `NEXT_PUBLIC_*` stays browser-safe. No new production dependencies added.
