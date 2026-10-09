# SwiftCare Tactical Command Design System

## 1. Design Direction & Ethos
- **Atmosphere:** Calm, precise, trustworthy, operational, rapid to scan, human-centered, and modern.
- **Philosophy:** Clarity over decoration. Information hierarchy over card count. Recognition over recall.
- **Anti-patterns Banned:**
  - No generic light-cream cards on dark backgrounds.
  - No oversaturated neon glows or sci-fi chatbot aesthetics.
  - No ungrounded, fabricated statistics or fake metrics.
  - No confusing route colors (e.g. green routes clashing with green status).
  - No missing epistemic badges.

---

## 2. Color Palette & Semantic Roles

### 2.1 Dark Command Canvas (Primary Operational Mode)
- **Base Canvas:** `#090D16` (Deep Navy-Slate)
- **Surface Level 1 (Panels & Shell):** `#0F1626`
- **Surface Level 2 (Cards & Modules):** `#162035`
- **Surface Level 3 (Interactive / Hover):** `#1E2C48`
- **Border Subtle:** `rgba(255, 255, 255, 0.08)`
- **Border Strong:** `rgba(255, 255, 255, 0.16)`
- **Foreground Primary:** `#F8FAFC` (Slate-50)
- **Foreground Secondary:** `#94A3B8` (Slate-400)
- **Foreground Muted / Telemetry:** `#64748B` (Slate-500)

### 2.2 Light Operational Canvas (Field Tablet & High-Glare Mode)
- **Base Canvas:** `#F8FAFC` (Slate-50)
- **Surface Level 1:** `#FFFFFF`
- **Surface Level 2:** `#F1F5F9` (Slate-100)
- **Border Subtle:** `#E2E8F0` (Slate-200)
- **Border Strong:** `#CBD5E1` (Slate-300)
- **Foreground Primary:** `#0F172A` (Slate-900)
- **Foreground Secondary:** `#475569` (Slate-600)

### 2.3 Semantic Operational Accents
- **Command Brand / Accent:** `#0284C7` (Sky-600) / Focus Ring `#38BDF8`
- **Critical / Emergency Alert:** `#EF4444` (Red-500) | Background `rgba(239, 68, 68, 0.12)`
- **Warning / Advisory:** `#F59E0B` (Amber-500) | Background `rgba(245, 158, 11, 0.12)`
- **Success / Optimal:** `#10B981` (Emerald-500) | Background `rgba(16, 185, 129, 0.12)`
- **Information / Notice:** `#3B82F6` (Blue-500) | Background `rgba(59, 130, 246, 0.12)`

### 2.4 Canonical Route & Cartographic Palette (Phase 21 Standard)
- **Planned / Active Route:** `#2563EB` (Cobalt Blue, weight 5, opacity 0.9)
- **Recommended Alternative Route:** `#8B5CF6` (Vibrant Purple, weight 5, opacity 0.85, dashed)
- **Other Alternative Routes:** `#64748B` (Neutral Slate Gray, weight 4, opacity 0.6)
- **Actual GPS Trajectory:** `#F97316` (High-contrast Orange, weight 4, dotted/polyline)
- **Incidents & Road Closures:** `#EF4444` (Tactical Red marker / hazard perimeter)

---

## 3. Epistemic Status Design System
Every operational metric must display its epistemic classification:

| Status | Visual Styling | Meaning | Examples |
|---|---|---|---|
| `OBSERVED` | Emerald badge `#10B981`, solid border | Direct hardware/sensor measurement | GPS coordinates, speed, vehicle ping, road incident report |
| `INFERRED` | Amber badge `#F59E0B`, dashed border | Algorithmically estimated or modeled | Predicted delay, bottleneck cause, ETA, recommended route |
| `UNKNOWN` | Slate badge `#64748B`, dotted border | Insufficient telemetry to determine | Cause of unmonitored deviation, telemetry lost |

---

## 4. Typography Hierarchy
- **Font Stack Primary:** Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif.
- **Font Stack Telemetry / Numerics:** "JetBrains Mono", Menlo, Monaco, Consolas, monospace.
- **Scale:**
  - `Display / KPI`: 32px / 2rem, Weight 700, Line-height 1.2
  - `Headline LG`: 24px / 1.5rem, Weight 600, Line-height 1.25
  - `Headline MD`: 18px / 1.125rem, Weight 600, Line-height 1.3
  - `Body Base`: 14px / 0.875rem, Weight 400/500, Line-height 1.45
  - `Caption / Badge`: 11px / 0.6875rem, Weight 600, Letter-spacing +0.05em, Uppercase
  - `Telemetry Metric`: 18px-24px Monospace, tabular figures (prevents layout jitter)

---

## 5. Component Standards
1. **AppHeader / DashboardTopbar:**
   - Unified persistent header with brand logo, active role badge, socket connectivity indicator, multi-workspace switcher links, and authenticated user logout.
2. **MissionAssessmentHUD:**
   - Direct prominent grid answering the 5 Problem-Statement questions with epistemic tags (`OBSERVED`, `INFERRED`, `UNKNOWN`).
3. **MapContainer & Controls:**
   - Full-bleed tactical map with layer toggles (Planned, Alternative, Trajectory, Incidents), legend, and camera controls.
4. **ActionPanel & DecisionApprovalCard:**
   - Clear progressive states: Recommendation -> Pending Operator Action -> Approve/Reject -> Executed.
5. **DriverManeuverHUD:**
   - Glanceable turn icons, distance-to-turn countdown, speed indicator, destination ETA, and emergency SMS trigger.
6. **Authentication & Onboarding (`LoginForm`, `SignupForm`):**
   - Clean slate-surface card with strict inline validation, real-time password strength checklist, 4-role interactive grid selector, multi-workspace access checkboxes, assigned vehicle identifier input, and dedicated quarantine status notifications (`PENDING` review).
7. **Route Protection Boundary (`ProtectedRoute`):**
   - High-fidelity gatekeeper enforcing role authorization, account approval status checks (`PENDING` quarantine screen, `SUSPENDED` banner), and workspace permission gating (`permittedWorkspaces`).
8. **Admin User Governance (`AdminUserManagement`):**
   - Interactive console with pending approval queues, one-click authorization (`Approve`), security quarantine (`Suspend`), role elevation, and workspace permission modification.
9. **Paramedic Clinical Vitals HUD:**
   - Real-time telemetry tiles for Heart Rate (BPM), Blood Pressure (systolic/diastolic), Oxygen Saturation (SpO2 %), and Glasgow Coma Scale (GCS 3-15) with dynamic clinical triage severity categorization.
10. **What-If Scenario Simulator (`/diff`):**
    - Comparative map interface with 5-color visual hierarchy, interactive metric delta cards (travel time, corridor delay, incident risk), and scenario playback scrubbers.

---

## 6. Role & Account State Design Tokens

### 6.1 Role Badges
| Role | Badge Color | Border & Glow | Context / Workspace |
|---|---|---|---|
| `ADMIN` | Purple `#A855F7` | `rgba(168, 85, 247, 0.2)` | `/admin` — System Observability & User Governance |
| `CONTROL_ROOM` | Sky Blue `#0284C7` | `rgba(2, 132, 199, 0.2)` | `/control-room`, `/emergencies/[id]` — Dispatch HUD |
| `DRIVER` | Emerald `#10B981` | `rgba(16, 185, 129, 0.2)` | `/driver/dashboard` — Turn-by-Turn Navigation & Telemetry |
| `PARAMEDIC` | Amber `#F59E0B` | `rgba(245, 158, 11, 0.2)` | `/paramedic` — Pre-Hospital Clinical Vitals & Trauma Bay |

### 6.2 Account Status Tokens
| State | Badge Styling | Meaning & Action |
|---|---|---|
| `APPROVED` | Emerald `#10B981` badge | Active account; unrestricted access to permitted workspaces |
| `PENDING` | Amber `#F59E0B` pulse badge | Quarantined on signup; awaits Administrator verification |
| `SUSPENDED` | Red `#EF4444` solid badge | Revoked access; immediately redirects to suspended boundary |

---

## 7. Interactive What-If & Telemetry Map Palette
- **Planned Corridor A (Default):** `#2563EB` (Cobalt Blue, 5px, opacity 0.9)
- **Deviated Trajectory (Observed):** `#F97316` (Vivid Orange, 4px dashed)
- **Recommended Alternative B:** `#8B5CF6` (Purple, 5px, opacity 0.95, pulse indicator)
- **Contingency Alternative C:** `#64748B` (Slate Gray, 4px, opacity 0.6)
- **Road Hazard / Incident Perimeter:** `#EF4444` (Hazard Red with 15% opacity radial buffer)
- **V2X Signal Preemption Node:** `#10B981` (Emerald Green halo when preemption active)

