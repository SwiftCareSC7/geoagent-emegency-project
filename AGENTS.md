<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## SwiftCare Engineering Methodology — Ponytail FULL (Default)

All four coding agents in this repo (**Claude Code**, **Antigravity / AGY**, **OpenCode**, and **Kilo Code**) use Ponytail FULL as the default engineering methodology.

```text
UNDERSTAND → MAKE THE SMALLEST COMPLETE CHANGE → VERIFY → STOP
```

- **Inspect Before Changing**: Inspect code, schemas, and runtime context before touching files.
- **Reuse Over Rebuilding**: Check existing components, services, and shared libraries before creating new ones.
- **Fix Root Causes**: No quick hacks or band-aids; write minimal, complete solutions.
- **Preserve Working Stack**: Next.js, Express, MongoDB, Socket.IO, Leaflet, and the Decision Engine.
- **Verification**: Run `npx tsc --noEmit` and targeted test suites after changes.
- **Commands**: `/ponytail [lite|full|ultra|off]`, `/ponytail-review`, `/ponytail-audit`, `/ponytail-debt`.

---

## AI Agent Toolkit & Discovery Protocol

### Four-Agent Shared Standards
1. **Claude Code (`claude`)**: Loads `.claude/settings.json`, `.claude/skills/`, `.mcp.json`, and inherits `CLAUDE.md` → `AGENTS.md`.
2. **Antigravity (`AGY`)**: Reads `.agents/skills/`, `AGENTS.md`, and IDE MCP configuration.
3. **OpenCode (`opencode`)**: Reads `AGENTS.md`, `.agents/skills/`, and `opencode.json` (MCP).
4. **Kilo Code (`kilocode`)**: Reads `.kilorules`, `.kilo/rules.md`, and `AGENTS.md`.

### Core Workflow Rules
- **Skill Scout**: At the beginning of substantial tasks, consult `docs/ai-toolkit/skill-index.json`. Load only the 1 to 3 skills directly needed from `.agents/skills/<skill-name>/SKILL.md`. Never dump entire skill catalogs into prompt context.
- **Token-Saver by Default**: Follow `.agents/skills/token-saver/SKILL.md`. Use targeted queries, surgical diffs, and concise operational updates.
- **Caveman Mode**: When token brevity is requested or context is constrained, invoke `/caveman` (`.agents/skills/caveman/SKILL.md`) to strip conversational filler while keeping technical substance exact.
- **Context7 for Current Docs**: When referencing third-party libraries, SDKs, or APIs, run `npx ctx7@latest docs <library-id> "<query>"` rather than relying on outdated weights.
- **Browser Automation**: Use `browser-harness` (`.agents/skills/browser-harness/SKILL.md`) only when dynamic browser interactions or visual verification are actively required.
- **Security & Quality Auditing**: Apply `vibesec` (`.agents/skills/vibesec/SKILL.md`) and `is-website-vulnerable` for auth, API security, and dependency audits.
- **Manifest Maintenance**: When tools, skills, or endpoints are added, updated, or removed, record the change in `docs/ai-toolkit/repository-manifest.json` and `docs/ai-toolkit/skill-index.json`.
- **Honest Verification**: Report genuine test outputs and tool states. Never claim an agent or tool is configured or verified without empirical proof.

---

<!-- graft:start -->
## Graft — repo context graph

This repo is indexed in `graft/`: small linked markdown nodes that explain each
system and carry exact file:line spans, kept in sync with the code through git.

For ANY task here — understanding how something works, finding where code lives,
or scoping a change — get context from the graph before grepping or opening
source files. Re-ask freely (it's cheap) and reuse literal identifiers you
already have (symbol, error string, file name) as the query. New to this repo?
Run `graft map` first — a token-budgeted orientation (dir clusters, hubs,
hotspots), no LLM, no key.

- Run `graft ask "<your question>" --source` → ranked nodes with the relevant
  code spans inlined (each hit's ≤8-line crux by default; `--full` for whole
  definitions when the crux isn't enough). Match the tool to the task shape:
  for understanding or editing, the top node IS the answer — cite its
  `covers:` file:line spans and edit straight from `--source`. For
  exhaustive tasks ("every occurrence / every caller of this pattern"), ranked
  results are top-N, not complete — run `graft grep "<literal>"` instead
  (exhaustive over indexed files, grouped by enclosing symbol), falling back
  to raw `grep -rn` only for unindexed files.
- `graft skeleton <file>` → every definition's signature + span, ~10× cheaper
  than reading the file; use it to skim an API surface.
- `graft callers <symbol>` gives precomputed, exact edges — who calls this.
  Add `--direction out` for what it calls, or `--depth N` to walk
  transitively for the full blast radius. For structural questions, skip
  ranking and use this directly.
- Or browse: `graft/INDEX.md` lists every node; follow the links.
- Monorepos and folders of multiple repos rank fairly across sub-projects —
  hits carry `[scope/]` labels naming which one they're from. Narrow with
  `graft ask "<task>" --in <scope>/` once you know where you're working.

If a returned span is truncated ("+N more lines"), open the file at that exact
range before finalizing. Only open source files when a node genuinely lacks a
needed detail, and then at the exact file:line the node points to — never
re-read whole files.

After big code changes, refresh the graph with `graft build` (deterministic,
no API key, $0).
<!-- graft:end -->
