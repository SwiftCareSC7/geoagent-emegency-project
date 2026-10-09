# AI Coding Toolkit — Integration Report

**Date:** October 9, 2026  
**Project:** SwiftCare Emergency Dispatch & Telemedicine Platform  
**Harness Status:** All 4 Agents Integrated (Claude Code, Antigravity, OpenCode, Kilo Code)

---

## 1. Project Architecture Audit

SwiftCare is a full-stack real-time emergency healthcare coordination system:
- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS v4, Lucide React, Leaflet & React-Leaflet for mapping.
- **Backend**: Node.js / Express server, MongoDB / Mongoose, Socket.IO real-time dispatch events.
- **Decision Engine**: Deterministic emergency triage and dispatch rule engine (with human approval gate).
- **Tooling**: TypeScript (`tsc --noEmit`), ESLint, Graft code-graph engine (`@nanonets/graft`).

No breaking changes or unnecessary dependencies were introduced during toolkit integration.

---

## 2. Four Agents Audited & Configured

All four required agents were verified, configured, and bound to the shared repository standards:

1. **Claude Code (`claude`)**:
   - Discovered global executable at `~/.local/bin/claude`.
   - Settings configured in `.claude/settings.json` with Graft hooks, statusline, and permissions.
   - MCP server configured in `.mcp.json` (`graft mcp`).
   - Instructions set in `CLAUDE.md` linking directly to `@AGENTS.md`.
   - All 72 skills mirrored in `.claude/skills/` via symlinks to `.agents/skills/`.

2. **Antigravity (`AGY`)**:
   - Environment active in workspace.
   - Reads `.agents/skills/` natively for project skills.
   - Global user plugins at `~/.gemini/config/plugins/` verified.
   - Reads `AGENTS.md` for project methodology and discovery rules.

3. **OpenCode (`opencode`)**:
   - Discovered binary at `~/.nvm/versions/node/v24.18.0/bin/opencode`.
   - Configured `opencode.json` with Graft MCP server integration.
   - Created `.opencode/instructions.md` pointing to `AGENTS.md`.
   - OpenCode natively reads workspace `AGENTS.md` and `.agents/skills/`.

4. **Kilo Code (`kilocode`)**:
   - IDE extension verified (`kilocode.kilo-code-7.8.8-darwin-arm64`).
   - Project directory configured at `.kilo/`.
   - Created `.kilorules` and `.kilo/rules.md` referencing `AGENTS.md`, `token-saver`, and `skill-scout`.

---

## 3. Repositories Audit & Integration Status

All 30 requested repositories were audited, categorized, and recorded in `docs/ai-toolkit/repository-manifest.json`:

### Category A: Coding Agents, Workflows & Skills
| Repository | Role | Status | Path / Action |
|------------|------|--------|---------------|
| `JuliusBrussee/caveman` | Token compression communication | Newly registered | Canonical arm registered at `.agents/skills/caveman` |
| `DietrichGebert/ponytail` | Minimalist engineering methodology | Already present & active | `.agents/skills/ponytail`, `AGENTS.md` default |
| `davepoon/buildwithclaude` | Claude prompt/hook hub | Newly registered | Indexed as reference in `docs/ai-toolkit/references/buildwithclaude.md` |
| `affaan-m/ECC` | Harness optimization framework | Newly registered | Mapped into `token-saver` and `docs/ai-toolkit/references/ecc.md` |
| `obra/superpowers` | 15 agent workflow skills | Already present | Reused from user cache into `.agents/skills/superpowers` |
| `vercel-labs/agent-skills` | Vercel production skills | Newly registered | Real skills registered: `react-best-practices`, `vercel-optimize`, etc. |
| `multica-ai/andrej-karpathy-skills` | ML & deep learning engineering | Newly registered | Reused from user AGY store to `.agents/skills/andrej-karpathy` |
| `ayghri/i-have-adhd` | Focused output styling | Already present | `.claude/skills/i-have-adhd` & `~/.gemini/config/plugins/i-have-adhd` |
| `emilkowalski/skills` | UI animation & polish | Already present | `.agents/skills/emil-design-eng`, `animate` |
| `pbakaus/impeccable` | Design system CLI | Already present | `.agents/skills/impeccable`, CLI v0.1.11 |
| `open-gsd/gsd-core` | Git Ship Done engine | Newly registered | Documented in `docs/ai-toolkit/references/gsd-core.md` |
| `tt-a1i/archify` | Architecture diagramming | Newly registered | Documented in `docs/ai-toolkit/references/archify.md` |
| `trailhq/Graft` | Repo context graph | Already present | Globally installed, 1,492 nodes indexed in `graft/` |
| `github/spec-kit` | Specification CLI (`specify`) | Already present | Globally installed at `~/.local/bin/specify` |
| `ruvnet/ruflo` | Multi-agent flow runner | Already present | Globally installed at `~/.nvm/.../bin/ruflo` (v3.55.0) |

### Category B: Browser Automation, Research, Testing & Security
| Repository | Role | Status | Path / Action |
|------------|------|--------|---------------|
| `browser-use/browser-use` | Python browser agent core | Newly registered | Documented in `docs/ai-toolkit/references/browser-use.md` |
| `browser-use/browser-harness` | Chrome CDP automation skill | Newly registered | Registered at `.agents/skills/browser-harness` |
| `Panniantong/Agent-Reach` | Multi-platform web scraper CLI | Newly registered | Documented in `docs/ai-toolkit/references/agent-reach.md` |
| `lirantal/is-website-vulnerable` | Web CVE scanner | Already present | Globally installed CLI (v1.14.17) |
| `BehiSecc/VibeSec-Skill` | Security audit skill | Already present | `.agents/skills/vibesec` |
| `usestrix/strix` | AI penetration tester | Newly registered | Upstream installer requires interactive GUI; indexed as reference |
| `dialogflow/agent-human-handoff-nodejs` | Legacy human handoff | Newly registered | Archived upstream; documented as architecture reference |

### Category C: APIs, MCP, Documentation & Integrations
| Repository | Role | Status | Path / Action |
|------------|------|--------|---------------|
| `public-apis/public-apis` | Free API catalog | Newly registered | Indexed in `docs/ai-toolkit/references/public-apis.md` |
| `n0shake/Public-APIs` | Alternative API catalog | Newly registered | Indexed in `docs/ai-toolkit/references/n0shake-public-apis.md` |
| `HelpCode-ai/anythingmcp` | Universal API to MCP gateway | Newly registered | Indexed in `docs/ai-toolkit/references/anythingmcp.md` |
| `goodnight000/api-anything` | Self-healing web-to-API agent | Newly registered | Indexed in `docs/ai-toolkit/references/api-anything.md` |
| `upstash/context7` | Up-to-date doc fetcher CLI | Already present | Configured in global user rules (`npx ctx7@latest`) |
| `appwrite/appwrite` | End-to-end BaaS | Newly registered | Massive Docker platform; indexed as reference architecture |

### Category D: Frontend & Design Resources
| Repository | Role | Status | Path / Action |
|------------|------|--------|---------------|
| `Leonxlnx/taste-skill` | Design system generator | Already present | Deduplicated to `.agents/skills/taste-design` (per prompt rules) |
| `birobirobiro/awesome-shadcn-ui` | Curated shadcn UI blocks | Newly registered | Indexed in `docs/ai-toolkit/references/awesome-shadcn-ui.md` |

---

## 4. Real Vercel Agent Skills Integration

Audited official `vercel-labs/agent-skills` repository and existing local installations. Integrated:
1. `react-best-practices`: 60KB rule catalog covering modern React/Next.js patterns, server components, and state isolation.
2. `vercel-optimize`: Comprehensive performance optimization engine (Core Web Vitals, image optimization, edge caching).
3. `web-design-guidelines`: Accessible, mobile-first visual design heuristics.
4. `composition-patterns`: Component compositional boundaries and slot patterns.

All four are housed in `.agents/skills/` and symlinked to `.claude/skills/`.

---

## 5. Token-Saving Engine: Caveman, Ponytail, Token-Saver, Skill-Scout

1. **Ponytail FULL (`UNDERSTAND → SMALLEST COMPLETE CHANGE → VERIFY → STOP`)**:
   - Active project default in `AGENTS.md`. Eliminates dead code, speculative abstractions, and superfluous dependencies.
2. **Caveman Mode (`/caveman [lite|full|ultra]`)**:
   - Housed in `.agents/skills/caveman/SKILL.md`.
   - Compresses agent output by dropping conversational filler while retaining 100% of code snippets, file paths, and technical accuracy (~75% token reduction on chat turns).
3. **Token-Saver Skill (`.agents/skills/token-saver/SKILL.md`)**:
   - Directs agents to use Graft structural queries (`graft ask`, `graft skeleton`) before opening source files.
   - Enforces targeted file edits and Context7 queries.
4. **Skill-Scout Skill (`.agents/skills/skill-scout/SKILL.md`)**:
   - Queries `docs/ai-toolkit/skill-index.json` to load only 1–3 skills on demand rather than bloating context with entire directories.
