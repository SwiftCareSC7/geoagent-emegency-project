# SwiftCare GeoAgent: UI/UX Design & Architecture Research

## 1. Executive Summary & Problem Context

SwiftCare GeoAgent is an emergency medical operations and AI-augmented routing platform. Emergency dispatchers and field drivers operate under extreme cognitive pressure where seconds dictate patient outcomes. The redesign replaces visual disorder, clashing light/dark palettes, and unstructured card grids with a unified, high-trust, calm, operational command design system.

---

## 2. Research Sources & Applied Decisions

### 2.1 Computer-Aided Dispatch (CAD) & Mission Control Systems

- **Research Source:** Human-Factors Guidelines for Emergency Dispatch Operations (APCO, US Dept. of Homeland Security, ITU CAD ergonomics guidelines).
- **Finding:** In safety-critical environments, interfaces must maximize rapid visual scanning, minimize decorative visual noise, and reduce cognitive latency. Operators scan for *anomalies* (deviations, traffic surges, delays) rather than inspecting uniform rows of data.
- **SwiftCare Design Decision:**
  - Standardized operational canvas with tonal depth hierarchy: Base floor `#090D16`, elevated panels `#111726`, floating overlays `#1A2234`.
  - Crisp 1px structural borders (`rgba(255,255,255,0.08)`) instead of muddy, blurred shadows.
  - Elimination of clashing light-cream backgrounds on dark command shells.

### 2.2 Epistemic Status (Observed vs. Inferred vs. Unknown)

- **Research Source:** Cognitive Systems Engineering (Woods & Hollnagel, NASA Ames Mission Control UI standards).
- **Finding:** High-stakes automated systems fail when operators cannot distinguish between *measured telemetry* (GPS coordinates, speed, ping time) and *model inferences* (predicted delay, probable cause, AI reroute recommendations). False certainty causes mistrust and delayed operator intervention.
- **SwiftCare Design Decision:**
  - Every operational indicator must explicitly display its epistemic provenance:
    - `OBSERVED`: Solid emerald badge (`#10B981`) — GPS telemetry, road sensors, hospital status.
    - `INFERRED`: Amber badge (`#F59E0B`) with dashed indicator — Predicted delays, estimated causes, traffic simulation.
    - `UNKNOWN`: Muted slate badge (`#64748B`) with dotted indicator — Missing telemetry, unverifiable external blockages.
  - GeoAgent AI reasoning is presented with transparent evidence citations and confidence scores.

### 2.3 The 5 Core Operational Questions

- **Research Source:** Operational Question-Led Decision Support Frameworks for Rapid Triage.
- **Finding:** When an operator selects an active emergency, they require answers to five specific operational questions without hunting through navigation tabs:
  1. *Has the ambulance deviated from its planned route?*
  2. *What caused the deviation?*
  3. *How much delay is expected?*
  4. *What is the best alternative route?*
  5. *Should another ambulance be dispatched instead?*
- **SwiftCare Design Decision:**
  - Create a dedicated **Mission Assessment HUD** prominently positioned in the Control Room and Emergency Detail views.
  - Direct 1-to-1 visual cards answering each of the 5 questions, backed directly by backend calculation (`/api/analysis/vehicle/:id` and `/api/decisions/active`).

### 2.4 Cartographic Hierarchy & Color Conventions (Phase 21 Compliance)

- **Research Source:** Cartography & Geovisualization Specialist Guidance (`cartography-geoviz`), ColorBrewer2, and Leaflet tactical styling standards.
- **Finding:** Map layers must have unambiguous semantic color coding. Combining green for routes and green for availability creates fatal confusion. Basemaps must remain muted (CartoDB Positron / Dark Matter) so tactical vector data clearly dominates.
- **SwiftCare Map Standard:**
  - **BLUE** (`#2563EB` / `#3B82F6`): Planned / Active canonical route corridor.
  - **PURPLE** (`#8B5CF6` / `#A855F7`): Recommended GeoAgent alternative route.
  - **GRAY / SLATE** (`#64748B`): Candidate alternatives / non-selected routes.
  - **ORANGE** (`#F97316`): Actual GPS vehicle trajectory history.
  - **RED** (`#EF4444`): Active road incident / hazard / blockage.
  - Explicit visual legend and toggle controls permanently accessible.
  - Strict Leaflet coordinate order handling `[lat, lng]` vs GeoJSON `[lng, lat]`.

### 2.5 Driver Navigation-First Ergonomics

- **Research Source:** In-Vehicle Information Systems (IVIS) & SAE J2364 Reach and Glancability Standards.
- **Finding:** Drivers in moving emergency vehicles need large glanceable typography, immediate next-maneuver vectors, distance-to-turn countdowns, and tactile emergency triggers. Heavy administrative dashboards cause distraction and navigation errors.
- **SwiftCare Design Decision:**
  - High-contrast Navigation HUD with bold turn direction arrows and distance countdown.
  - Single-tap Emergency Status SMS dispatcher (`/api/emergencies/:id/send-status-sms`).
  - Clear reroute alert drawer with instant "Accept Reroute" or "Keep Current Route" actions.
  - Fix the `(NaNm)` maneuver calculation bug in driver navigation.

### 2.6 Human-in-the-Loop Decision State Architecture

- **Research Source:** IEEE Transactions on Human-Machine Systems: Safety-Critical Decision Support.
- **Finding:** AI proposals must never execute destructively or re-dispatch ambulances without explicit human confirmation. The interface must visually differentiate a *Pending Recommendation* from an *Executed Action*.
- **SwiftCare Design Decision:**
  - Four distinct lifecycle phases:
    1. `RECOMMENDATION`: GeoAgent analyzes telemetry + corridor incidents.
    2. `PENDING OPERATOR ACTION`: Operator reviews comparison matrix (ETA delta, distance delta, risk).
    3. `APPROVE` / `REJECT`: Operator inputs approval or rejection with reason.
    4. `EXECUTE`: Dispatch commands broadcast via Socket.IO to vehicle navigation.
