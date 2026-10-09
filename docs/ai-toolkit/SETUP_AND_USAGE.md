# AI Coding Toolkit — Setup & Usage Guide

This guide describes how to use the integrated AI Coding Toolkit across **Claude Code**, **Antigravity (AGY)**, **OpenCode**, and **Kilo Code** in the SwiftCare project.

---

## 1. Agent Discovery & Architecture

All four agents share a unified canonical store for project skills:

- **Canonical Skill Directory**: `.agents/skills/`
- **Claude Code Skill Mirror**: `.claude/skills/` (symlinked directly to `.agents/skills/`)
- **Shared Instructions**: `AGENTS.md` (inherited by `CLAUDE.md`, `.kilorules`, `.kilo/rules.md`, and OpenCode)
- **Repo Context Graph**: `graft/` with MCP server and CLI commands
- **Skill Fast Index**: `docs/ai-toolkit/skill-index.json`
- **Repository Manifest**: `docs/ai-toolkit/repository-manifest.json`

| Agent | Config Path | Skills Path | MCP Config | Instructions File |
| ------- | ------------- | ------------- | ------------ | ------------------- |
| **Claude Code** (`claude`) | `.claude/settings.json` | `.claude/skills/` | `.mcp.json` | `CLAUDE.md` (`@AGENTS.md`) |
| **Antigravity** (`AGY`) | `~/.gemini/config/` | `.agents/skills/` | `.gemini/config/mcp_config.json` | `AGENTS.md` |
| **OpenCode** (`opencode`) | `opencode.json` | `.agents/skills/` | `opencode.json` | `AGENTS.md`, `.opencode/instructions.md` |
| **Kilo Code** (`kilocode`) | `.kilo/` | `.agents/skills/` | IDE MCP runtime | `.kilorules`, `.kilo/rules.md` |

---

## 2. Token-Saving Workflow (Active by Default)

Every agent session must prioritize context token conservation:

1. **Graft Before Grep**:
   - Query symbols or functions: `graft ask "<query>" --source`
   - Skim an API surface without reading whole files: `graft skeleton <path/to/file>`
   - Find incoming callers: `graft callers <symbol>`
2. **Selective Skill Loading (`skill-scout`)**:
   - Do NOT load all skills into prompt memory.
   - Consult `docs/ai-toolkit/skill-index.json` or `AI_TOOLKIT.md`.
   - Load at most 1–3 skills specific to your subtask (e.g. `react-best-practices` for UI, `vibesec` for auth).
3. **Ponytail Methodology**:
   - `UNDERSTAND → SMALLEST COMPLETE CHANGE → VERIFY → STOP`.
   - Prefer stdlib/existing helpers over new packages.
   - Use `/ponytail full` (default), `/ponytail-review`, or `/ponytail-audit`.
4. **Caveman Communication (`/caveman`)**:
   - When token reduction is requested, switch to Caveman style: drops filler words, articles, and conversational padding while retaining 100% of code snippets, file paths, and technical precision.
5. **Context7 for Library APIs**:
   - Search docs: `npx ctx7@latest library <name> "<query>"`
   - Fetch exact doc section: `npx ctx7@latest docs <id> "<query>"`

---

## 3. Tool Activation Cheat Sheet

| Task | Primary Tool / Skill | Invocation Command |
| ------ | ---------------------- | ------------------- |
| **Code Navigation** | Graft | `graft ask "<query>" --source` or `graft skeleton <file>` |
| **Code Minimalism** | Ponytail | `/ponytail` or `.agents/skills/ponytail/SKILL.md` |
| **Compressed Output** | Caveman | `/caveman [lite\|full\|ultra]` |
| **Skill Scouting** | Skill Scout | Read `docs/ai-toolkit/skill-index.json` |
| **Frontend Polish** | Vercel & Emil Kowalski | `.agents/skills/react-best-practices`, `emil-design-eng`, `animate` |
| **Web Vitals Tuning** | Vercel Optimize | `.agents/skills/vercel-optimize` |
| **Security Auditing** | VibeSec & Vulnerability Scanner | `.agents/skills/vibesec`, `is-website-vulnerable http://localhost:3000` |
| **Spec-Driven Dev** | Spec-Kit | `specify init <feature-dir>` |
| **Multi-Agent Orchestration** | Ruflo | `ruflo --help` |
| **Browser Testing** | Browser-Harness | `.agents/skills/browser-harness` |
| **Documentation Fetch** | Context7 | `npx ctx7@latest docs <id> "<query>"` |
