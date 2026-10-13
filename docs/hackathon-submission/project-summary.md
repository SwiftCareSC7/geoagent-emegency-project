# SwiftCare GeoAgent — canonical project summary

This is the single evidence base for both submission PDFs (`pitch.html`, `report.html`).
If a fact changes, change it here first, then in both documents.

Audit date: 10 Oct 2026. Branch `main`, commit `d516074` (local `main` equals `origin/main`).

## 1. What the project is

A web dispatch prototype for ambulance missions in Bengaluru. It watches each ambulance's GPS against its planned
road corridor, measures drift and delay, compares alternative routes, and produces a rule-based recommendation
(continue, reroute, consider a backup unit, alert the control room). An optional AI assistant (GeoAgent) explains the
situation using read-only tools. Nothing that changes a mission happens without a human operator approving it.

It is a prototype. No real emergency service, traffic-signal network or patient data is connected.

## 2. Verified state of code, GitHub and deployment

| Item | Status | Evidence |
|---|---|---|
| Local branch | `main` at `d516074`, identical to `origin/main` | `git rev-list` |
| GitHub | public repo `SwiftCareSC7/geoagent-emegency-project`; 4 PRs, all closed (PR 1 = phases 3–5 merged 10 Oct) | GitHub REST API (unauthenticated; `gh` CLI not logged in) |
| CI on `d516074` | **CI workflow: success** (gitleaks, typecheck, build, backend suites, Docker build) | GitHub Actions API |
| `deploy.yml` | reports **failure** on every push — the Cloud Run job is fully commented out ("Inactive") | GitHub Actions API, file content |
| Frontend | Vercel production `geoagent-emegency-project-livid.vercel.app`, built from `d516074` | `vercel inspect`, HTTP 200 |
| Backend | Render web service `geoagent-emegency-project.onrender.com`, restarted 15:47 UTC after the merge | `/api/health`, `/api/health/ready` = ready, database connected |
| Commits | 358 since 23 Aug 2026 | `git rev-list --count HEAD` |

Live provider status reported by `/api/health/providers` (10 Oct 2026):

| Provider | Live status |
|---|---|
| MongoDB Atlas | AVAILABLE |
| Socket.IO gateway | AVAILABLE |
| Routing | `ROUTING_PROVIDER=google` but no Google key → falls back to **OSRM** (OpenStreetMap road router) |
| Traffic | **mock** provider |
| Google Roads snapping | NOT_CONFIGURED → Turf.js geometric fallback |
| GeoAgent LLM | NOT_CONFIGURED (no OpenRouter/OpenCode key) → **deterministic fallback** answers |
| Python V2X engine | DEGRADED → JavaScript fallback (script not on the Render build path) |
| CARTO basemap key | NOT_CONFIGURED |

## 3. Numbers (all counted from source)

- 13 Next.js pages, 35 same-origin API proxy routes (BFF) on Vercel.
- 80 backend method+path combinations (75 under 14 `/api/*` routers + `GET /` + 4 health routes).
- 9 Mongoose models, 17 backend modules.
- 12 GeoAgent read-only tools.
- 24 server-to-client Socket.IO event names defined, 21 actually emitted; 6 client room commands; rooms `control-room`, `emergency:<id>`, `vehicle:<id>`.
- 16 decision reason codes, 5 decision actions, 5 decision statuses.
- 43 backend test scripts, 4 Node unit-test files, 11 navigation unit tests, 2 Playwright e2e specs.

## 4. Architecture (as deployed)

Browser → Vercel (Next.js 16.4.0, React 19, same-origin `/api/*` proxy routes, HttpOnly session cookie) → Render
(Express 4, Node 22) → MongoDB Atlas (Mongoose 8). Socket.IO connects the browser straight to Render using a short-lived
token from `/api/auth/socket-token`. Backend calls out to OSRM for road geometry; Google Routes/Roads, OpenRouter/OpenCode
LLMs and MSG91 SMS are supported in code but not configured live.

## 5. Feature inventory

Status key: **Tested** = automated test passes; **Built** = code path exists and is wired, no dedicated passing test
found; **Partial** = some layers missing; **Simulated** = runs on demo/mock data by design.

| Feature | Status | Notes |
|---|---|---|
| Login, registration, admin approval, 4 roles | Tested | 46/46 RBAC, 22/22 socket RBAC, 18/18 auth-fallback (local run + CI) |
| Workspace-based page guard (`ProtectedRoute`) | Built | role → allowed pages map in `lib/auth/roles.ts` |
| Vehicle, emergency, incident CRUD with role checks | Tested (via RBAC suite) | delete is ADMIN-only |
| Road routing (OSRM live; Google optional) | Tested | `test-google-osrm-routing.js` |
| Two-leg missions (to scene, to hospital) | Built | Route model `legs` with `TO_EMERGENCY` / `TO_HOSPITAL` |
| Deviation detection 50/100/250 m, bearing 30°/60°, 3-fix stability | Built + used by tests | `deviation.config.js`, env-tunable |
| Delay prediction with factor epistemics (OBSERVED/DERIVED/INFERRED/UNKNOWN) | Built | `prediction.model.js` |
| Route comparison (`/routes/:id/compare`) | Built | backend 12–15 s; proxy timeout 50 s |
| Decision engine + approval lifecycle (backend) | Tested in CI suites; rules read in full | idempotent 30 s window, audit fields |
| Approve / reject / execute from the UI | Partial | **no Vercel proxy for `/decisions/:id/approve|reject|execute` → 404** |
| Run analysis from mission page (orchestration analyze) | Partial | **no Vercel proxy → 404** |
| Driver incident report | Partial | `/api/incidents` proxy is GET-only → POST 405 |
| Full trail on mission detail | Partial | `/api/trajectories/:id` history has no proxy → 404 (latest/recent work) |
| Reroute execution guarded by unchanged-candidate check | Built | 409 if candidate changed |
| GeoAgent tool loop (free models only, deterministic fallback) | Tested (25 unit tests pass) | live LLM not configured |
| Real-time updates (Socket.IO, rooms, JWT auth on connect) | Tested | `test-part9.js`, socket RBAC 22/22 |
| V2X green-wave corridor & clearance sessions | Simulated, Tested | 4 fixed demo signals; `isSimulated` flag on sessions |
| Driver dashboard: navigation HUD, reroute from current position | Partial | backend `POST /routes/:id/reroute` works; **no Vercel proxy → 404 in deployed app** |
| Control room: manual route override | Partial | backend works; **no Vercel proxy → 404** |
| Control room: assign / reassign unit | Partial | backend works; **no Vercel proxy → 404** |
| Control room: task-routing recommendations panel | Partial | backend works; **no Vercel proxy → 404**; Approve/Dismiss buttons are UI only |
| Control room: audit history | Built | uses existing `/api/decisions` proxy |
| Push-to-talk voice | Simulated | mic permission + recording timer only; no audio is sent (needs WebRTC) |
| Status SMS (MSG91) | Built, not verified live | mock mode exists; live keys not confirmed |
| Admin console: users, stats, provider health, database explorer | Built | admin-only; 7 collections + prediction analytics; demo seed/reset behind ADMIN auth |
| Paramedic page | Built | 454-line page; no clinical integration |
| Emergency lab and before/after "diff" scenario page | Simulated | scripted scenarios |
| Telemetry retention (TTL 90 days default) | Tested | `test-telemetry-retention.js` |
| Production DB safety guards | Tested | `test-db-safety.js` |

## 6. Decision engine (from `decision.rules.js`)

1. Missing emergency or vehicle → ALERT_CONTROL_ROOM, CRITICAL, `INSUFFICIENT_DATA`. Nothing is guessed.
2. Vehicle not operational → alert, CRITICAL. Route not ACTIVE → alert, WARNING.
3. DEVIATED / CRITICAL_DEVIATION, HEAVY/SEVERE traffic, an ACTIVE CRITICAL incident on the corridor, or a blocked V2X corridor → "needs reroute".
4. Alternatives scored by ETA + traffic weight (0–4) + incident weight (0–3); best one must save ≥ 2 min.
5. Needs reroute and a viable alternative → REROUTE; no viable alternative → ALERT_CONTROL_ROOM (never invents a route).
6. HIGH/CRITICAL priority and (ETA > 15 min or delay > 8 min) → look for a backup that arrives ≥ 5 min sooner → CONSIDER_BACKUP.
7. Otherwise CONTINUE (`OPERATIONAL_BASELINE`).
8. If GeoAgent's suggestion disagrees, `AI_RECOMMENDATION_CONFLICT` is recorded; it never blocks or changes the rule result.
9. Primary action priority: ALERT > REROUTE > CONSIDER_BACKUP > CONTINUE > NO_ACTION.

Statuses: PENDING_OPERATOR_ACTION → APPROVED / REJECTED / CANCELLED; APPROVED → EXECUTED / CANCELLED.
Execution: ALERT emits an event; REROUTE activates the approved candidate only if unchanged; CONSIDER_BACKUP records
the recommendation and does **not** dispatch; CONTINUE / NO_ACTION do nothing.

## 7. GeoAgent AI (from `geoagent.provider.js`, `geoagent.agent.js`, `geoagent.constants.js`)

- Providers: OpenRouter (all prices 0 in live catalog) then OpenCode (`-free` model ids). Free models only — a model is re-checked against the catalog right before each call.
- Up to 3 models per provider, 4 model attempts per request; 60 s request timeout; failed model cooled down 60 s, bad key 10 min.
- Loop: max 6 rounds, 3 tool calls per round, 8 tool calls total, 8 s per tool; identical calls de-duplicated; last round offers no tools so the model must answer.
- 12 read-only tools: emergency state, vehicle state, recent trajectory, current route, route alternatives, traffic analysis, prediction, nearby incidents, decision history, vehicle situation, nearby available vehicles, corridor green-wave status.
- Confidence below 0.5 → `requiresOperatorReview`; time saving counts as material at ≥ 2 min.
- If no provider works: deterministic fallback response with `fallback: true`. This is the live behaviour today.

## 8. Security

- JWT (7 d default) in an HttpOnly cookie, `SameSite=None` in production; bcrypt password hashes.
- Every data router uses `protect` + `requireRole`; trajectories and vehicles add ownership checks for drivers/paramedics.
- Rate limits: auth 30 per 15 min, AI analysis 30 per min, mutations 120 per min.
- Helmet headers, CORS allow-list from `CLIENT_URL`.
- Gitleaks secret scan in CI (working tree + history with baseline).
- MongoDB URI validated and redacted before logging at start-up (exception: dbSafety refusal message, see defects).
- Production login fails closed if the backend is unreachable; the local SQLite store is development-only.
- Known exposure: `POST /api/routes/calculate` is public (by design for the landing demo; worth rate-limiting).

## 9. Verification run for this document (10 Oct 2026)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | pass |
| `npm run build` (Next.js) | pass |
| Navigation unit tests (Playwright runner) | 11 / 11 pass |
| `node --test tests/*.mjs` | 25 / 26 pass — `diff-scenario-engine.test.mjs` cannot load an extension-less `.ts` import under plain Node |
| Backend suites on a throwaway local MongoDB | pass: db-uri, routes-unknown-ids, db-safety, telemetry-retention, navigation-engine, part9 (realtime), google-osrm-routing, phase2-reroute, clearance-v2x, v2x-corridor-pipeline (11/11), polyline, coordinate conversions (5/5) |
| Auth suites against a local server (CI procedure) | RBAC 46/46, socket RBAC 22/22, auth fallback 18/18 |
| `test-phase3-4-5.js` | **fails**: its vehicle fixture omits the required `capacity` field (test bug; not in CI) |
| GitHub CI on `d516074` | success |
| Live probes (no session) | proxied paths answer 401; approve/reject/execute, decisions/analyze, orchestration analyze & recommendations, override, reroute, assign, trajectory history → **404**; incidents POST → **405** |

## 10. Known defects and gaps

1. Missing Vercel proxy routes for UI calls: decision approve/reject/execute, orchestration analyze + recommendations, override, assign, driver reroute, incident POST, trajectory history. The deployed UI cannot approve a decision.
2. `test-phase3-4-5.js` fixture bug (missing `capacity`).
3. `deploy.yml` fails on every push because it has no active jobs.
4. Python V2X engine never runs on Render (script path); JS fallback gives the same maths.
5. Traffic is mock; LLM not configured live; Google keys absent.
6. Render free tier sleeps when idle (first request can take ~1 min).
7. Push-to-talk sends no audio.
8. Security: `server/shared/utils/dbSafety.js` `assertSafeDatabaseTarget` includes the unredacted `MONGO_URI` in its error message/log.
9. Driver browser GPS is shown on screen only; not uploaded as telemetry.

## 11. Team and submission fields

Not provided. Placeholders: team name, four member names, website URL, Google Drive video URL.
Values live in `submission.json`; the build injects them. Repository and live app URLs are verified.
