# Kilo Code Project Rules — SwiftCare AI Coding Toolkit

Inherits root agent instructions: see [AGENTS.md](file:///Users/priyanshu/Documents/geoagent-emegency-project/AGENTS.md).

## Operational Directives
1. **Understand → Minimal Change → Verify → Stop**:
   - Follow Ponytail FULL methodology. Inspect before editing; never create bloated speculative abstractions.
2. **Token Efficiency First**:
   - Activate `token-saver` protocol by default.
   - Use `graft ask "<query>" --source` or `graft skeleton <file>` before reading entire files.
   - For version-specific library docs, use `npx ctx7@latest docs <id> "<query>"`.
3. **Skill Discovery via Skill-Scout**:
   - Query `docs/ai-toolkit/skill-index.json` or `AI_TOOLKIT.md`.
   - Load only the 1 to 3 skills directly needed for the active task from `.agents/skills/<skill-name>/SKILL.md`.
4. **Communication**:
   - If requested, switch to `caveman` mode (`/caveman`) to cut conversational tokens by ~75% while keeping exact technical precision.
5. **Quality & Security**:
   - Always run `npx tsc --noEmit` and relevant tests after meaningful edits.
   - Run security reviews with `vibesec` for any auth, secrets, or endpoint modifications.
