---
name: token-saver
description: >
  Enforces maximum token efficiency across agent workflows without sacrificing engineering quality,
  correctness, or security. Combines Ponytail code minimalism, Caveman communication conciseness,
  Graft structural navigation, and targeted Context7/documentation retrieval.
---

# Token-Saver Protocol

Activate this skill by default on every task to eliminate token bloat while maintaining engineering rigor.

## Core Directives

1. **Concise Operational Context**: Avoid verbose commentary, conversational filler, and blow-by-blow narration. Summarize actions succinctly (`[target] → [action] → [result]`).
2. **Inspect Before Reading**:
   - Never load large source files into context blindly.
   - Use `graft ask "<query>" --source` or `graft skeleton <file>` first.
   - Target exact line spans with `view_file` (specifying `StartLine` and `EndLine`).
3. **Focused Searching**:
   - Use `grep_search` with exact symbols, file patterns, or `graft grep "<literal>"`.
   - Never execute open-ended tree dumps or dump full directories into context.
4. **Lazy Skill Loading**:
   - Read only the 1–3 skill instructions directly needed for the active subtask via `skill-scout`.
   - Never load an entire skill catalog into context at once.
5. **Deterministic Execution**:
   - Prefer deterministic shell commands (`tsc --noEmit`, targeted test scripts, `git diff --stat`) over speculative multi-turn queries.
   - Use surgical edits (`replace_file_content` or `multi_replace_file_content`) rather than rewriting whole files.
6. **Reuse Over Rebuilding**:
   - Check existing utilities, libraries, and components before writing new helper functions.
   - Reuse canonical tools across all agents (Claude Code, Antigravity, OpenCode, Kilo Code).
7. **Version-Specific Docs via Context7**:
   - When library behavior or API syntax is needed, use `npx ctx7@latest docs <id> "<query>"` rather than browsing broad web pages or hallucinating outdated syntax.
8. **No Redundant Delegation**:
   - Avoid unneeded subagent handoffs, duplicate planning cycles, or duplicate code reviews when a single direct turn suffices.
9. **Rigor is Non-Negotiable**:
   - **NEVER** skip type-checking, automated tests, linting, accessibility, or security validations to save tokens.
   - **NEVER** truncate code in a way that breaks functionality, readability, or architectural integrity.

## Synergy with Caveman and Ponytail

- **Ponytail (`/ponytail`)**: Dictates **code behavior** — the smallest complete change that solves the issue. Stdlib > third-party deps; delete bloat.
- **Caveman (`/caveman`)**: Dictates **communication style** — cuts token overhead by stripping pleasantries, filler words, and narrative padding while retaining 100% of technical precision and exact code snippets.
- **Token-Saver**: Dictates **tool & context methodology** — structural navigation, lazy asset loading, surgical file editing, and zero-redundancy execution.
