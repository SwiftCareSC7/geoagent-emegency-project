# SwiftCare AI Coding Toolkit — System Manifest & Status

Default methodology: **Ponytail FULL** (`UNDERSTAND → SMALLEST COMPLETE CHANGE → VERIFY → STOP`).  
Skills store: `.agents/skills/` (mirrored to `.claude/skills/`).  
Shared Agent Protocol: [AGENTS.md](file:///Users/priyanshu/Documents/geoagent-emegency-project/AGENTS.md).

---

## 1. The Four Agents

| Agent | Config File | MCP Config | Instructions Entrypoint | Status |
|-------|-------------|------------|-------------------------|--------|
| **Claude Code** (`claude`) | `.claude/settings.json` | `.mcp.json` | `CLAUDE.md` (`@AGENTS.md`) | Verified & Active |
| **Antigravity** (`AGY`) | `~/.gemini/config/` | `.gemini/config/mcp_config.json` | `AGENTS.md` | Verified & Active |
| **OpenCode** (`opencode`) | `opencode.json` | `opencode.json` | `AGENTS.md`, `.opencode/instructions.md` | Verified & Active |
| **Kilo Code** (`kilocode`) | `.kilo/` | IDE MCP runtime | `.kilorules`, `.kilo/rules.md` | Verified & Active |

---

## 2. Core Toolkit & Verification Table

| Tool / Skill | Repository / Origin | Type | Local Path | Verified |
|---|---|---|---|---|
| **Ponytail** | `DietrichGebert/ponytail` | Methodology Skill | `.agents/skills/ponytail/SKILL.md` | **YES** |
| **Caveman** | `JuliusBrussee/caveman` | Token Compression Skill | `.agents/skills/caveman/SKILL.md` | **YES** |
| **Token-Saver** | Project Custom | Token Protocol | `.agents/skills/token-saver/SKILL.md` | **YES** |
| **Skill-Scout** | Project Custom | Selective Discovery | `.agents/skills/skill-scout/SKILL.md` | **YES** |
| **Graft** | `trailhq/Graft` | Repo Graph CLI / MCP | `graft/`, `@nanonets/graft@0.21.1` | **YES** |
| **Context7** | `upstash/context7` | Doc Fetcher CLI | `npx ctx7@latest` | **YES** |
| **Vercel Agent Skills** | `vercel-labs/agent-skills` | Performance & Best Practices | `.agents/skills/vercel-optimize`, `.agents/skills/react-best-practices` | **YES** |
| **Superpowers** | `obra/superpowers` | 15 Workflow Skills | `.agents/skills/superpowers/`, `.agents/skills/using-superpowers/` | **YES** |
| **Andrej Karpathy** | `multica-ai/andrej-karpathy-skills` | ML Engineering Skill | `.agents/skills/andrej-karpathy/SKILL.md` | **YES** |
| **VibeSec** | `BehiSecc/VibeSec-Skill` | Security Audit Skill | `.agents/skills/vibesec/SKILL.md` | **YES** |
| **Browser-Harness** | `browser-use/browser-harness` | Browser CDP Skill | `.agents/skills/browser-harness/SKILL.md` | **YES** |
| **Impeccable** | `pbakaus/impeccable` | Design System CLI / Skill | `.agents/skills/impeccable/`, engine v0.1.11 | **YES** |
| **Spec-Kit** | `github/spec-kit` | Specification CLI | `~/.local/bin/specify` (specify-cli) | **YES** |
| **Ruflo** | `ruvnet/ruflo` | Multi-Agent Flow Runner | `~/.nvm/.../bin/ruflo` (v3.55.0) | **YES** |
| **is-website-vulnerable** | `lirantal/is-website-vulnerable` | Web Security Scanner | `~/.nvm/.../bin/is-website-vulnerable` (1.14.17) | **YES** |
| **Taste Design** | `Leonxlnx/taste-skill` | Design System Skill | `.agents/skills/taste-design/SKILL.md` (canonical deduplicated) | **YES** |
| **i-have-adhd** | `ayghri/i-have-adhd` | Focused Output Skill | `.claude/skills/i-have-adhd/SKILL.md` | **YES** |
| **BuildWithClaude** | `davepoon/buildwithclaude` | Prompt/Hook Reference | `docs/ai-toolkit/references/buildwithclaude.md` | **YES** |
| **ECC** | `affaan-m/ECC` | Harness Optimization Reference | `docs/ai-toolkit/references/ecc.md` | **YES** |
| **GSD Core** | `open-gsd/gsd-core` | Execution Workflow Reference | `docs/ai-toolkit/references/gsd-core.md` | **YES** |
| **Archify** | `tt-a1i/archify` | Architecture Diagram Reference | `docs/ai-toolkit/references/archify.md` | **YES** |
| **Browser-Use** | `browser-use/browser-use` | Browser Agent Core Reference | `docs/ai-toolkit/references/browser-use.md` | **YES** |
| **Agent-Reach** | `Panniantong/Agent-Reach` | Multi-Platform Web Scraper | `docs/ai-toolkit/references/agent-reach.md` | **YES** |
| **Strix** | `usestrix/strix` | AI Pentest Reference | `docs/ai-toolkit/references/strix.md` | **YES** |
| **Dialogflow Handoff** | `dialogflow/agent-human-handoff-nodejs`| Human Handoff Reference | `docs/ai-toolkit/references/agent-human-handoff.md` | **YES** |
| **Public APIs** | `public-apis/public-apis` | API Catalog Reference | `docs/ai-toolkit/references/public-apis.md` | **YES** |
| **Public APIs (n0shake)**| `n0shake/Public-APIs` | Alternative API Catalog | `docs/ai-toolkit/references/n0shake-public-apis.md` | **YES** |
| **AnythingMCP** | `HelpCode-ai/anythingmcp` | Universal API-to-MCP Gateway | `docs/ai-toolkit/references/anythingmcp.md` | **YES** |
| **API Anything** | `goodnight000/api-anything` | Web-to-API Adapter Reference | `docs/ai-toolkit/references/api-anything.md` | **YES** |
| **Appwrite** | `appwrite/appwrite` | Backend Architecture Reference | `docs/ai-toolkit/references/appwrite.md` | **YES** |
| **Awesome Shadcn** | `birobirobiro/awesome-shadcn-ui` | UI Blocks Catalog Reference | `docs/ai-toolkit/references/awesome-shadcn-ui.md` | **YES** |

---

## 3. Toolkit Documentation Artifacts

- **Repository Manifest (30 Repos)**: [repository-manifest.json](file:///Users/priyanshu/Documents/geoagent-emegency-project/docs/ai-toolkit/repository-manifest.json)
- **Fast Skill Index (72 Skills)**: [skill-index.json](file:///Users/priyanshu/Documents/geoagent-emegency-project/docs/ai-toolkit/skill-index.json)
- **Setup & Usage Guide**: [SETUP_AND_USAGE.md](file:///Users/priyanshu/Documents/geoagent-emegency-project/docs/ai-toolkit/SETUP_AND_USAGE.md)
- **Integration Report**: [INTEGRATION_REPORT.md](file:///Users/priyanshu/Documents/geoagent-emegency-project/docs/ai-toolkit/INTEGRATION_REPORT.md)
- **Verification Report**: [VERIFICATION_REPORT.md](file:///Users/priyanshu/Documents/geoagent-emegency-project/docs/ai-toolkit/VERIFICATION_REPORT.md)
- **External References Index**: [docs/ai-toolkit/references/](file:///Users/priyanshu/Documents/geoagent-emegency-project/docs/ai-toolkit/references/README.md)
