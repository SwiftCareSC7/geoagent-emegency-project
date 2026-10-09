# OpenCode Agent Instructions — SwiftCare AI Coding Toolkit

Follows root instructions in [AGENTS.md](../AGENTS.md).

1. Methodology: Ponytail FULL (Understand → Smallest Complete Change → Verify → Stop).
2. Token Protocol: Use `token-saver` by default. Query `graft ask` before opening files.
3. Skill Scouting: Search `docs/ai-toolkit/skill-index.json`, load 1–3 targeted skills from `.agents/skills/`.
4. MCP: Graft MCP server is configured in `opencode.json`.
5. Testing: Run `npx tsc --noEmit` and targeted test scripts.
