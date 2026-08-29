# Changelog

All notable changes to the GeoAgentic Emergency Response System will be documented in this file.

## [Unreleased] - Part 7

### Added — Frontend (SwiftCare GeoAgent Prototype)
- Added Next.js App Router frontend at project root (`app/`, `components/`, `lib/`)
- Added root layout with Inter + Plus Jakarta Sans fonts, SEO metadata, favicon setup
- Added Tailwind CSS v4 design system with SwiftCare brand palette (navy, critical, warning, success, route colors)
- Added Landing Page (`/`) with Hero section, Feature Cards, Contact Section, Help modal
- Added Login Page (`/login`) — prototype form that bypasses auth and redirects to dashboard
- Added Signup Page (`/signup`) — role selection (Driver / Control-room Operator), driver-specific fields (Ambulance ID, hospital base)
- Added Driver Dashboard (`/driver/dashboard`) with:
  - `DashboardTopbar` — emergency status badge, driver info, brand logo
  - `EtaSummary` — large ETA display, time saved, destination
  - `MapPlaceholder` — SVG schematic map with planned/actual/recommended route lines and markers (ambulance, accident, congestion, destination)
  - `TimelinePanel` — event log with severity-colored dots (how GeoAgent reached its recommendation)
  - `RouteStatusCards` — 8 stat cards covering deviation & benefit analysis
  - `GeoAgentCard` — AI recommendation explanation
  - Action bar: Refresh Route, View Alternative Route toggle, Contact Control Room with confirmation modal
- Added reusable UI components:
  - `Button` (CVA-based with 6 variants and 8 sizes, built on @base-ui/react)
  - `Modal` (accessible dialog with Esc close, backdrop blur, focus management)
  - `BrandLogo` (Next.js Image with text fallback)
  - `StatCard` (icon + label + value + hint, tone-based coloring)
- Added `lib/api.ts` adapter pattern (mock ↔ real backend toggle)
- Added `lib/mock-data.ts` with static Bengaluru demo scenario (KA-01-AMB-108)
- Added `lib/utils.ts` with `cn()` utility (clsx + tailwind-merge)
- Added static assets: hero-ambulance.png, swiftcare-logo.png, favicons (light/dark/SVG/apple)

### Added — GeoAgent AI Module
- Added `server/modules/geoagents/geoAgent.service.js` — Gemini function-calling PoC
  - Uses `@google/genai` with `gemini-3.6-flash` model
  - Defines `getNewRoute` tool for alternative route discovery
  - Two-step flow: (1) Gemini requests tool call, (2) tool returns mock routes, (3) Gemini analyzes and recommends best route
- Added `server/modules/geoagents/geoAgent.tools.js` — mock tool returning 3 routes with ETAs and traffic levels
- Added `@google/genai` to server dependencies

### Changed
- Updated AI_MEMORY.md, README.md, CHANGELOG.md, and WALKTHROUGH.md to reflect all Part 7 additions

## [Unreleased] - Part 6
### Added
- Added Route model to store emergency vehicle paths
- Added Routing service abstraction layer (google, mapbox, osrm)
- Added Mock routing provider for deterministic development routes
- Added Route creation API (`POST /api/routes`)
- Added Route retrieval APIs (`GET /api/routes`, `GET /api/routes/:routeId`)
- Added Emergency route retrieval (`GET /api/emergencies/:emergencyId/routes`)
- Added GeoJSON LineString support and strict Point validation
- Added distance and duration calculations via `@turf/turf`
- Added Geospatial utility service (point-to-route distance, nearest point, bearing)
- Added `2dsphere` indexes on Route geometries
- Updated README, WALKTHROUGH, and AI_MEMORY

## [Unreleased] - Part 5
### Added
- Added Trajectory model for vehicle GPS history
- Added GPS ingestion API (`POST /api/trajectories`)
- Added Latest Location API (`GET /api/trajectories/:vehicleId/latest`)
- Added Trajectory History API with pagination (`GET /api/trajectories/:vehicleId`)
- Added Recent Trajectory API (`GET /api/trajectories/:vehicleId/recent`)
- Added strict GeoJSON Point validation, timestamp clock-skew validation, and speed limits
- Added MongoDB `2dsphere` index for GPS points
- Added highly-optimized compound index `{ vehicle: 1, timestamp: -1 }`
- Created `AI_MEMORY.md` to serve as a persistent AI agent memory context
- Updated `README.md` and `WALKTHROUGH.md` with GPS architecture

## [Unreleased] - Part 4
### Added
- Added Emergency model
- Added Incident model
- Added emergency APIs (`/api/emergencies`)
- Added incident APIs (`/api/incidents`)
- Added vehicle assignment workflow with MongoDB transaction structure
- Added `2dsphere` geospatial indexes for locations and destinations
- Added strict GeoJSON Point validation
- Added soft-delete strategy for operational records
- Added emergency and incident role-based authorization
- Updated `README.md` with new endpoints and feature checklist
- Updated `WALKTHROUGH.md` with detailed architecture and security breakdown

### Changed
- Refactored architecture into a modular layout (`modules/auth`, `modules/vehicles`, `modules/emergencies`, `modules/incidents`, `shared/middleware`)
