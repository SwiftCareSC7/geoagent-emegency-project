# SwiftCare — "The Corridor" Frontend Redesign Prompt

> Paste everything below the line into Claude Code from the repo root. Built with `enhance-prompt` + `frontend-design`, grounded in `docs/design-system.md` and `docs/design-research.md`, with shadcn components verified in the `@shadcn` registry.

---

You are the **design lead and senior frontend engineer** for SwiftCare GeoAgent, an emergency-ambulance dispatch and AI-routing platform used by dispatchers, ambulance drivers, paramedics and admins. Redesign the whole web app so it looks distinctive and professional and is effortless to use under pressure — **without losing a single working feature**. Work **locally only**: I will review on `localhost` before anything is committed to `main` or pushed.

## 0. Hard rules (read before anything else)

1. `git switch -c redesign/the-corridor`. Commit locally after each step below with a clear message. **Never run `git push`, open a PR, or deploy.**
2. Read `node_modules/next/dist/docs/` for any Next.js 16 API you touch (this is not the Next.js in your training data).
3. **Change presentation, not behavior.** Do not edit anything in `lib/`, `server/`, `app/api/`, socket handlers, auth/role logic, fetch calls, or component props/state shape. If a visual change truly requires a logic change, stop and ask me.
4. Stack stays: Next.js 16 App Router, React 19 + React Compiler, Tailwind v4 (`app/globals.css`), shadcn `new-york` (`components.json`), Base UI / Radix, `lucide-react`, Leaflet, `next-themes`.
5. Map semantics are fixed (from `docs/design-system.md` §2.4): planned route **#2563EB**, recommended alternative **#8B5CF6** dashed, other alternatives **#64748B**, GPS trajectory **#F97316**, incidents **#EF4444**. Keep Leaflet `[lat,lng]` vs GeoJSON `[lng,lat]` ordering untouched.
6. Every GeoAgent / analysis value keeps its **OBSERVED / INFERRED / UNKNOWN** badge (design-system §3).
7. Before saying "done", run the checks in §7 **and pass the §7b reviewer loop**, and show me the real output.

## 1. Skills — load each exactly when its step starts (max 3 at once)

| Step | Load (`Skill` tool / `.agents/skills/<name>/SKILL.md`) | Use it for |
|---|---|---|
| 2 Baseline | `swiftcare-fullstack-design-loop`, `webapp-testing` | Preservation matrix, Playwright screenshots |
| 3 Direction | `frontend-design`, `impeccable`, `taste-design` | Token plan, critique against generic defaults |
| 3 Design doc | `design-md` | Write `DESIGN.md` from the tokens |
| 4 Stitch (optional) | `enhance-prompt`, `stitch-generate-design`, `stitch-react-components` | Mock the two key screens, then translate to React |
| 5 Components | `shadcn-ui` (+ shadcn MCP), `composition-patterns`, `react-best-practices` | Install and compose primitives |
| 5 Maps | `cartography-geoviz` | Basemap, legend, layer hierarchy |
| 6 Motion | `emil-design-eng`, `animation-vocabulary`, `review-animations` | Motion specs and review |
| 6 Usability | `web-design-guidelines`, `i-have-adhd` | Cognitive load, scanning, copy |
| 6 Auth screens | `vibesec` | Keep validation and security intact |
| 7 QA | `webapp-testing`, built-in browser (`mcp__Claude_Browser__*`) | Visual + functional verification |

If a skill file is missing, say so and continue — don't invent its contents.

## 2. Baseline (no visual changes yet) — do §2b first, then steps 1–4 here

1. `graft map`, then `graft ask "<page> layout" --source` per route to locate code. Routes in scope:
   `/`, `/login`, `/signup`, `/register`, `/registration`, `/control-room`, `/control-room/overview`, `/driver/dashboard`, `/paramedic`, `/emergencies/[id]`, `/emergency-lab`, `/diff`, `/admin`.
2. Write `docs/redesign/preservation-matrix.md`: one row per route → every button, form field, tab, modal/sheet, map control/layer toggle, API call, Socket.IO event, role guard. Columns: `Item | File:line | Before ✅ | After ✅`.
3. Record baselines: `npx tsc --noEmit`, `npm run test`, `npm run test:e2e` → save pass/fail counts in `docs/redesign/baseline.md`.
4. Start the dev server (add a `dev` entry to `.claude/launch.json` running `npm run dev` on port 3000 — the existing entry runs `npm start`, which needs a build). Screenshot every route at **375×812** and **1440×900**, light and dark, into `docs/redesign/before/`.

## 2b. Run the full stack, accounts and demo data (do this before the baseline screenshots)

The UI is useless to test without the backend, data and role accounts. Do this first and write the exact steps you used to `docs/redesign/run-the-app.md`.

1. **Backend + DB:** read `.env.example` and `.env.local` (names only — never print secret values). Start MongoDB as the project expects, then the Express server (`cd server && npm run dev`). Start the frontend with `npm run dev`. Confirm both respond and Socket.IO connects (the app's connection indicator shows Live).
2. **Role accounts — verified facts about this machine:** MongoDB is running (`mongod` via Homebrew). The Express backend uses `PORT=5001` (`server/.env`); the frontend dev server on 3000 may already be running — reuse it, don't start a second one. **`ADMIN_PASSWORD`, `OPERATOR_PASSWORD`, `DRIVER_PASSWORD` and `PARAMEDIC_PASSWORD` are currently unset** in `.env.local` and `server/.env`; the seed script hashes `OPERATOR_PASSWORD` and `ADMIN_PASSWORD` and will crash without them. `npm run seed:demo` creates only `operator@swiftcare.local` and `admin@swiftcare.local`; **driver and paramedic users are not created by any seed script**.
   - Generate strong random **test-only** passwords yourself and write them to `server/.env` and `.env.local` (both are git-ignored — confirm with `git check-ignore` before writing). Do not print them in chat or in any committed file.
   - Run the seed, then create `driver@swiftcare.local` and `paramedic@swiftcare.local` (and one `PENDING` and one `SUSPENDED` test user) through the app's own signup + admin-approval flow, which also tests that flow. `e2e/auth-rbac.spec.ts` and `server/test-bootstrap-admin.js` show the expected emails and flow.
   - Never use real credentials. Record only the emails, never the passwords, in `run-the-app.md`.
3. **Realistic data:** run `npm run seed:demo` (use `npm run seed:demo:reset` first if data is stale), then start `server/demo-telemetry-player.js`, which replays the E-DEMO-001 / AMB-DEMO-01 scenario (normal speed → bottleneck → deviation → reroute proposal → approval → executed, about 2 min 20 s). Every screen must be judged with this data live, never empty.
4. If something can't start (missing env var, no MongoDB), stop and tell me exactly what's missing. Don't mock the backend.

## 3. Design direction: "The Corridor"

**Concept:** The brand idea is the *emergency corridor* — the path that clears ahead of an ambulance. The route line is the visual signature of the whole product: it is the hero on the landing page, the spine of the dispatcher view, and the main object on the driver screen. Everything else stays quiet so the corridor and live status read instantly. Spend boldness in **one** place per screen (the route/map); keep the chrome disciplined.

**Palette** — keep the existing tokens in `docs/design-system.md` §2; map them into shadcn CSS variables in `app/globals.css` (`:root` = light, `.dark` = dark):

| Token | Dark | Light | Role |
|---|---|---|---|
| `--background` | Command Navy `#090D16` | Field White `#F8FAFC` | Page canvas |
| `--card` / panels | Panel Slate `#0F1626` / `#162035` | `#FFFFFF` / `#F1F5F9` | Surfaces, 3 elevation levels |
| `--primary` | Dispatch Sky `#0284C7` (focus `#38BDF8`) | same | Primary actions, focus ring |
| `--destructive` | Signal Red `#EF4444` | same | Critical, incidents |
| status warn / ok / info | `#F59E0B` / `#10B981` / `#3B82F6` | same | Status only, never decoration |
| `--border` | `rgba(255,255,255,.08)` / strong `.16` | `#E2E8F0` / `#CBD5E1` | 1px hairlines, no muddy shadows |

**Typography** — replace Inter + Plus Jakarta with **Barlow** (via `next/font/google` in `app/layout.tsx`). Barlow is derived from highway signage — right for a road-routing product. Use **Barlow Semi Condensed** 600–700 for headings and big ETAs, **Barlow** 400/500 for UI text, keep **JetBrains Mono** with `font-variant-numeric: tabular-nums` only for live telemetry (ETA countdowns, coordinates, vehicle IDs, timestamps). Scale: 12 / 14 / 16 / 20 / 28 / 40 / 64px, line-height 1.45 body / 1.1 display. Sentence case everywhere; the only uppercase is the epistemic and role badges (they encode meaning).

**Avoid these defaults** (they read as AI-generated): identical rounded card grids with soft grey shadows, gradient washes, an all-caps label above every heading, highlighting one word in a headline, `→` appended to buttons, `01/02/03` markers on non-sequences, fade-up on every section.

**Radii:** 6px controls, 10px panels, full pill only for badges. **Spacing:** 4px base, 8-pt rhythm.

Write all of this into `DESIGN.md` at the repo root using the `design-md` skill, then show me the token plan in chat **before** touching components. Self-critique it with `impeccable`: if any choice could belong to any other SaaS dashboard, revise it and tell me what changed.

## 4. Stitch mockups (optional — only if a Stitch MCP server is connected)

Check with `ToolSearch "stitch"`. If no Stitch tools exist, **skip this step and say so**. If they exist: run `enhance-prompt` with `DESIGN.md` on (a) the landing hero and (b) the control room, generate both with `stitch-generate-design`, show me the images, and convert only the approved one with `stitch-react-components` — translating to the existing components, not pasting raw output.

## 5. Build, page by page

**Install only these shadcn components** (verified in `@shadcn`; each pulls its own dependency — list the new packages for me):
```bash
npx shadcn@latest add command tooltip sonner drawer resizable kbd
```
(`command` → `cmdk`, `sonner` → `sonner`, `drawer` → `vaul`, `resizable` → `react-resizable-panels`.) Reuse what's already in `components/ui/` (`button`, `badge`, `dialog`, `sheet`, `tabs`, `table`, `skeleton`, `alert`) — restyle through tokens, don't fork them.

**Global shell (do first):** unify `components/landing/site-header.tsx` and `components/dashboard/dashboard-topbar.tsx` into a consistent shell: logo (`brand-logo.tsx`), role badge, live-connection indicator (Live / Reconnecting / Offline, with text), data-freshness ("Updated 3 s ago"), theme toggle, ⌘K command palette (`command`) that lists every navigation target and the actions already available on the current page, toast system (`sonner`) replacing ad-hoc alerts.

**Page structure:**

1. **`/` Landing** (`components/landing/*`, `app/page.tsx`)
   1. Header: logo, links, "Sign in" (secondary) + "Open control room" (primary).
   2. Hero: full-bleed muted dark basemap (CartoDB Dark Matter) with **one** animated corridor — a blue route drawing itself across the city, an incident appearing in red, the purple alternative drawing in, the ambulance marker switching over. Plays once on load (~4 s), then rests; static under reduced motion. Headline states what SwiftCare does in plain words; one sentence of subtext; two CTAs.
   3. "Who it's for": four role panels (Dispatcher, Driver, Paramedic, Admin), each showing a small real screenshot of that workspace and one sentence on what they do there.
   4. Use-case coverage (`use-case-coverage.tsx`): the five operational questions from `design-research.md` §2.3 shown as the actual sequence a dispatcher follows (numbered — it is a real sequence).
   5. Contact (`contact-section.tsx`) + footer. No invented statistics.
2. **Auth** (`components/auth/LoginForm.tsx`, `SignupForm.tsx`): two-column at ≥1024px — form left, quiet static corridor illustration right; single column on mobile. Labels above fields, inline errors under the field, password show/hide, role picker as four selectable panels with a description each, `PENDING`/`SUSPENDED` states styled per design-system §6.2. **Keep every validation rule, field name and submit handler exactly as-is.**
3. **`/control-room`** (`components/dashboard/control-room-dashboard.tsx` + panels): map fills the viewport. Floating panels over it, built with `resizable` and collapsible:
   - Left: active emergencies queue (severity by color + icon + text), filter and search.
   - Right: Mission Assessment HUD (5 questions), GeoAgent card, decision approval card with the 4 states Recommendation → Pending → Approve/Reject → Executed.
   - Bottom dock: vehicle fleet strip.
   - Keyboard: `/` focus search, `j`/`k` next/previous emergency, `Enter` open, `Esc` close panel, `⌘K` palette — shown with `kbd` in tooltips.
   - Below 1024px: panels become tabs over the map.
4. **`/control-room/overview`** (`components/control-room/multi-emergency-overview.tsx`): same shell, multi-emergency map with a sortable list.
5. **`/driver/dashboard`** (`components/driver/*`): mobile-first, for use while driving. Maneuver card with 64px distance and a large turn arrow; ETA in Barlow Semi Condensed 40px; everything else in a `drawer` bottom sheet. Targets ≥ 56px. Reroute alert: full-width, two buttons ("Accept new route" / "Keep current route"), no auto-dismiss. High-contrast night palette by default. Fix the `(NaNm)` maneuver display noted in `design-research.md` §2.5 **only if** it is a formatting bug in a component; if the bug is in `lib/`, report it instead.
6. **`/paramedic`**: vitals tiles (HR, BP, SpO₂, GCS) with triage severity, mission timeline, hospital ETA.
7. **`/emergencies/[id]`** (`components/emergency-detail/*`): status bar, map, Mission Assessment HUD, decision log with epistemic badges, timeline.
8. **`/emergency-lab`, `/diff`** (`components/diff/*`): `resizable` split panes, synced side-by-side maps, metric delta panels (travel time, corridor delay, incident risk).
9. **`/admin`** (`components/admin/*`): tables with sticky headers, search, density toggle, pending-approval queue first, confirm dialog on Suspend, health tiles.

**Every async view** gets a `skeleton` loading state, an empty state that tells the user what to do next, and an error state that says what failed and how to retry.

**Maps** (`components/map/*`, `real-interactive-map.tsx`, `driver-navigation-map.tsx`): restyle only — basemap (Positron light / Dark Matter dark), legend (`map-legend.tsx`) always visible and collapsible, controls restyled with tokens, popups (`popup-content.ts`) using the new type. Do not change layer data or geometry code.

## 5b. Per-page acceptance checklist (the Tester must pass every line)

| Route | Must pass |
|---|---|
| `/` | All nav links and both CTAs work; hero corridor animation plays once and is static under reduced motion; role panels link to the right login; contact form validates and shows success/error; no invented numbers |
| `/login` `/signup` `/register` `/registration` | Valid login for each role lands on the right workspace; wrong password shows the exact error; empty/invalid fields show inline errors; password toggle works; signup enforces the strength checklist and role/workspace selection; PENDING and SUSPENDED screens show; already-logged-in users are redirected; logout works |
| `/control-room` | Emergencies queue lists the seeded emergency; selecting it updates map and HUD; all 5 HUD questions show values with OBSERVED/INFERRED/UNKNOWN badges; layer toggles show/hide each route color; legend matches; a decision can be approved and rejected (with reason) and the state moves Pending → Executed; fleet dock selects a vehicle; ⌘K, `/`, `j`/`k`, `Esc` work; assigning/overriding a route works as before |
| `/control-room/overview` | Multi-emergency list sorts and filters; clicking a row opens `/emergencies/[id]` |
| `/driver/dashboard` | Scenario selector works; maneuver card, distance and ETA update with telemetry; reroute alert appears with both buttons and each does its job; incident modal opens/closes; SMS-status button calls its endpoint and shows a toast; bottom sheet opens/closes; nothing overlaps at 375×812 |
| `/paramedic` | Vitals tiles update; triage severity color + text changes with values; assessment inputs validate; hospital ETA shows |
| `/emergencies/[id]` | Direct URL load works; unknown id shows a designed not-found state; timeline and decision log render with badges |
| `/emergency-lab`, `/diff` | Scenario picker works; both maps stay synced; metric deltas (travel time, corridor delay, incident risk) update; playback scrubber plays/pauses/seeks |
| `/admin` | Overview tiles load; pending users can be Approved/Suspended (with confirm dialog) and the status badge changes; role and workspace edits save; database explorer, providers and health tabs load; non-admins are blocked |

## 6. Motion and usability

- Durations 150–250 ms for UI, ease-out for entering, ease-in for exiting; one orchestrated moment per page (landing hero corridor, reroute line draw). No looping animations except the live-vehicle pulse.
- Number changes (ETA, counts) animate with a short roll; new emergency enters the queue with one red outline pulse, then settles.
- `prefers-reduced-motion: reduce` → all motion instant, hero shows the final frame.
- Copy: active verbs, the same action name on button and toast ("Approve reroute" → "Reroute approved"), errors say what happened and how to fix it.
- Run `review-animations` on the result and fix anything it flags.

## 6b. Realism, devices, performance and decisions

- **Demo mode:** add a visible "Run demo scenario" control (only when running in development/demo) that starts the telemetry replay, so I can watch the whole flow in about 2 minutes. It must call the existing demo player; don't fake data in the UI.
- **Before/after viewer:** generate `docs/redesign/compare.html` (static, no build): each route, light and dark, before and after side by side at 375 and 1440, with a route filter. Regenerate it every round.
- **Visual regression:** add Playwright `toHaveScreenshot()` specs under `e2e/visual/` for every route (light and dark, 375 and 1440), with animations disabled and live data frozen (seeded scenario at a fixed stage). Commit the approved snapshots at the end of each passing round.
- **Real devices:** run `/driver/dashboard` and `/` in the iOS Simulator (`mcp__Claude_Code_iOS_Simulator__control`, open the dev URL via `open_url`) at iPhone size, and `/control-room` at 768×1024 and 1024×768. Check touch targets (≥ 56px on driver, ≥ 44px elsewhere), safe areas, and no horizontal scroll.
- **Performance budget:** Lighthouse (not installed — run it with `npx lighthouse` or `npx @lhci/cli`, and tell me if it can't run) ≥ 90 performance and ≥ 95 accessibility on `/` and `/login`; initial JS for `/` under 250 kB gzipped; Leaflet and heavy panels loaded lazily; no layout shift when live data updates (use `tabular-nums`, fixed-size containers).
- **Stress cases (Tester):** 50 simultaneous emergencies, 100 vehicles, Socket.IO dropping and reconnecting mid-reroute, an API returning 500, a 40-character name and a 120-character address — layouts must not break and errors must be designed.
- **Decisions log:** append every major design choice and its reason to `docs/redesign/decisions.md`. Reviewers read it so they don't reverse a deliberate choice without a reason.
- **Docs agree:** update `docs/design-system.md` (fonts, any token changes) so it matches `DESIGN.md`; if they conflict, `DESIGN.md` wins and the older doc is edited.

## 7. Verify (all must pass — show me the output)

1. `npx tsc --noEmit` → 0 errors.
2. `npm run test` and `npm run test:e2e` → pass count ≥ baseline in `docs/redesign/baseline.md`.
3. Every row in `preservation-matrix.md` marked After ✅ after clicking it in the browser.
4. No console errors on any route (`read_console_messages`).
5. WCAG AA contrast in both themes; visible focus rings; full keyboard path through login → control room → approve a decision; dialogs/sheets trap focus and close on `Esc`.
6. Screenshots of every route at 375 and 1440, light and dark, in `docs/redesign/after/`.

## 7b. The quality loop (repeat until the tester approves)

After the build, do **not** stop. Run this loop. Keep the same branch, commit each round locally (`round-N: <what changed>`), and never push.

**Roles** (use the `Agent` tool; each reviewer starts with no memory of the build, so give it only the URLs, the files named below, and its rubric):

| Role | Agent | Job |
|---|---|---|
| Builder | you (main session) | Implements and fixes |
| Tester | `general-purpose` agent with `webapp-testing` + the built-in browser | Clicks **every** control, writes `docs/redesign/rounds/round-N/test-report.md` |
| Design critic | `impeccable-finish-reviewer` agent | Scores visual quality against `DESIGN.md` and the approved direction |
| UX / a11y reviewer | `general-purpose` agent with `web-design-guidelines`, `i-have-adhd`, `vibesec` | Scores usability, accessibility, auth safety |

**Score anchors (all reviewers use these):** 10 = nothing a picky professional would flag, every state designed; 9 = only cosmetic nits, no usability or accessibility impact; 7–8 = noticeable roughness or one confusing flow; 5–6 = works but looks or feels unfinished; ≤ 4 = broken or misleading. A score above 8 needs at least three specific things the reviewer checked and found good, named in the report.

**Memory between rounds:** context will run out over a long loop. All state lives in files: `docs/redesign/rounds/summary.md`, each round's reports, `preservation-matrix.md`, `decisions.md`. Start every round (and every reviewer) by reading those files, not by relying on conversation history.

**Each round:**
1. **Test everything (Tester).** From `preservation-matrix.md`, exercise every route and every interactive element: each button, link, form field (valid, invalid, empty), tab, dropdown, modal/sheet/drawer (open, close with Esc, focus trap), map control and layer toggle, filter, search, keyboard shortcut, theme toggle, ⌘K palette, login/logout, and every role's workspace (Dispatcher, Driver, Paramedic, Admin, plus PENDING and SUSPENDED accounts). Also: reload mid-flow, back/forward, 375px and 1440px, light and dark, reduced motion on, console errors, failed API calls (offline/Socket.IO disconnected), slow network. Record each item as PASS / FAIL / BLOCKED with a screenshot or console excerpt. A control not tested is a FAIL.
2. **Score (all three reviewers, independently).** Each scores 1–10 on its rubric and lists defects as `severity | route | what | how to reproduce`:
   - Tester: functionality, regressions vs. baseline, console cleanliness, error/empty/loading states.
   - Design critic: hierarchy, typography, color semantics, map legibility, distinctiveness (would this pass for any other SaaS dashboard?), consistency with `DESIGN.md`.
   - UX/a11y: clarity of next action, cognitive load for a stressed dispatcher, driver glanceability, WCAG AA, keyboard path, copy.
3. **Gate.** The loop ends only when **all** hold:
   - Visual regression snapshots, Lighthouse budgets and device checks from §6b pass.
   - Every score ≥ **9/10**.
   - **Zero** FAIL or BLOCKED items and zero Critical/High defects.
   - `tsc --noEmit` clean; tests ≥ baseline; no console errors.
   - Two consecutive rounds meet the above (so a lucky pass doesn't end it).
4. **Rebuild (Builder).** Fix every defect, highest severity first, at the root cause (a shared component, not a patch on one page). Re-verify the fix yourself in the browser, update the preservation matrix, commit, then start round N+1 with **fresh** reviewer agents.
5. **Anti-gaming rules.** Reviewers must open pages themselves, not read your summary. Never lower a rubric, delete a failing test, or mark something "known issue" to pass. If a defect needs a logic change in `lib/`, `server/` or `app/api/`, stop and ask me instead of editing it.
6. **Circuit breaker.** If the same defect survives 3 rounds, or you reach round 8, stop and report what's blocking.

Write `docs/redesign/rounds/summary.md` after every round: round number, scores per reviewer, open defects, what was fixed.

## 8. Checkpoints with me

- **Checkpoint A** — after step 3: show me the token plan + `DESIGN.md`. Wait for my OK.
- **Checkpoint B** — after the global shell, landing and control room: give me the `localhost:3000` URLs and before/after screenshots. Wait for my OK.
- **Checkpoint C** — only after the §7b loop's gate passes: final report with screenshots, preservation matrix, test results, new dependencies, anything you could not finish. **Do not push.**
