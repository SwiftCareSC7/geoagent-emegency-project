---
name: skill-scout
description: >
  On-demand skill discovery and selective loading protocol. Indexes project and agent skills,
  matches task context against skill metadata, and selectively loads only the minimal relevant
  1 to 3 skills without blowing up the context window.
---

# Skill-Scout Protocol

Run this discovery step at the beginning of any substantial task across all agents (Claude Code, Antigravity, OpenCode, Kilo Code).

## Discovery Workflow

```text
TASK ARRIVES → CONSULT SKILL INDEX → MATCH 1–3 SKILLS → VIEW TARGETED SKILL.md → EXECUTE
```

1. **Consult Fast Index First**:
   - Query `docs/ai-toolkit/skill-index.json` or `AI_TOOLKIT.md` for registered skills and their tags.
   - Do NOT run directory listings of every skill folder or cat all `SKILL.md` files at once.
2. **Match by Task Domain**:
   - **Frontend UI & Polish**: `react-best-practices`, `shadcn-ui`, `emil-design-eng`, `animate`, `taste-design`, `web-design-guidelines`
   - **Performance & Vercel**: `vercel-optimize`, `composition-patterns`, `debug-optimize-lcp`
   - **Architecture & Code Navigation**: `graft`, `ponytail`, `token-saver`, `writing-plans`
   - **Testing & QA**: `browser-harness`, `test-driven-development`, `systematic-debugging`
   - **Security**: `vibesec`, `is-website-vulnerable`, `firebase-security-rules-auditor`
   - **Documentation & Research**: `context7`, `literature-search-arxiv`, `davepoon/buildwithclaude`
   - **Executive Functioning / Communication**: `caveman`, `i-have-adhd`, `andrej-karpathy`
3. **Selective Loading (1 to 3 Skills Maximum)**:
   - Use `view_file` to read ONLY the chosen `SKILL.md` (e.g., `.agents/skills/<skill-name>/SKILL.md`).
   - If a skill has referenced scripts or templates, read them strictly on-demand.
4. **Shared vs Native Resolution**:
   - Primary shared location: `.agents/skills/` (shared with `.claude/skills/` via symlinks).
   - Agent-specific locations:
     - Antigravity: `.agents/skills/`, `~/.gemini/config/plugins/`
     - Claude Code: `.claude/skills/`, `~/.claude/plugins/`
     - OpenCode: `AGENTS.md`, `.agents/skills/`, `opencode.json`
     - Kilo Code: `.kilorules`, `AGENTS.md`, `.agents/skills/`
5. **No Blind Stacking**:
   - Unload mental focus on irrelevant skills before moving to an unrelated subtask.
