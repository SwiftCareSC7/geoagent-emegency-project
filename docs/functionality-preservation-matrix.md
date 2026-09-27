# SwiftCare GeoAgent: Functionality Preservation Matrix

## 1. Route & Page Inventory

| Route | Page / Module | Current Implementation | Dependencies | New Design Location | Verification Required |
|---|---|---|---|---|---|
| `/` | Landing Page | `app/page.tsx`, `components/landing/*` | Next.js, Auth | Redesigned `app/page.tsx` + `components/landing/*` | Hero, Core Loop (Monitor->Detect->Explain->Predict->Recommend->Decide->Act->Verify), Who Uses It, Role CTAs |
| `/login` | Authentication | `app/login/page.tsx`, `components/auth/LoginForm.tsx` | `useAuth`, `authApi.login` | Redesigned `components/auth/LoginForm.tsx` | Role detection, validation, error messages, demo one-click credentials |
| `/signup` | User Registration | `app/signup/page.tsx`, `components/auth/SignupForm.tsx` | `useAuth`, `authApi.register` | Redesigned `components/auth/SignupForm.tsx` | Role selector (CONTROL_ROOM, DRIVER, PARAMEDIC, ADMIN), field validation |
| `/control-room` | Central Command Dashboard | `app/control-room/page.tsx`, `components/dashboard/control-room-dashboard.tsx` | `vehicleApi`, `emergencyApi`, `incidentApi`, Socket.IO, `ControlRoomMap` | Upgraded `components/dashboard/control-room-dashboard.tsx` | 5 Questions HUD, Mission Assessment, Map synchronization, live stream |
| `/emergencies/[id]` | Emergency Detail & Surveillance | `app/emergencies/[id]/page.tsx`, `components/emergency-detail/emergency-detail-view.tsx` | `useRealtimeEmergency`, `analysisApi`, `decisionApi`, `orchestrationApi` | Upgraded `components/emergency-detail/emergency-detail-view.tsx` | Epistemic states (Observed/Inferred/Unknown), Route comparison, Decision approve/reject, Timeline |
| `/driver/dashboard` | Driver Navigation | `app/driver/dashboard/page.tsx`, `components/driver/*` | `useRealtimeEmergency`, navigation adapter, maneuver HUD | Redesigned `components/driver/*` | Navigation-first HUD, fix NaN m bug, turn-by-turn vectors, Emergency SMS button |
| `/paramedic` | Paramedic Clinical & Triage View | NEW dedicated route (fulfills Phase 26) | `emergencyApi`, `vehicleApi`, Socket.IO | `app/paramedic/page.tsx`, `components/paramedic/*` | Patient vitals, triage code, hospital ETA, bed availability, handoff |
| `/admin` | Admin Console & Observability | `app/admin/page.tsx`, `components/admin/*` | `ProtectedRoute` (ADMIN), `providerHealth`, `predictionAnalytics` | Redesigned `app/admin/page.tsx`, `components/admin/*` | Health endpoints, database explorer, prediction ground truth stats |
| `/emergency-lab` | Simulation & Scenario Player | NEW dedicated route (fulfills Phase 28 & 29) | Demo scenarios, simulation engine, event injection | `app/emergency-lab/page.tsx`, `components/lab/*` | 18 canonical scenarios, event injection, live clock, replay, 5 core questions |

---

## 2. Real-Time Socket.IO Event Preservation

| Event Name | Direction | Payload | Preserved Handler |
|---|---|---|---|
| `vehicle.location.updated` | Server -> Client | `{ vehicleId, location, speed, heading, status }` | Map vehicle marker updates, HUD speed |
| `vehicle.status.updated` | Server -> Client | `{ vehicleId, status, timestamp }` | Fleet panel status badges |
| `trajectory.created` | Server -> Client | `{ vehicleId, point, crossTrackDistance }` | Map trajectory breadcrumbs, deviation detection |
| `emergency.created` | Server -> Client | Emergency document | Live emergency feed increment |
| `emergency.updated` | Server -> Client | Emergency updates | Status pills, assigned vehicle sync |
| `incident.created` | Server -> Client | Incident document | Hazard markers on map, corridor correlation |
| `incident.updated` | Server -> Client | Incident updates | Incident status (ACTIVE / RESOLVED) |
| `route.updated` | Server -> Client | `{ emergencyId, vehicleId, route }` | Active & recommended polylines |
| `route.deviation.detected` | Server -> Client | `{ vehicleId, emergencyId, deviation }` | Deviation alert banner, 5-questions HUD |
| `traffic.updated` | Server -> Client | `{ corridor, level, delayMinutes }` | Traffic bar, corridor green-wave status |
| `eta.updated` | Server -> Client | `{ vehicleId, currentMinutes, delayMinutes }` | ETA countdown badges |
| `prediction.updated` | Server -> Client | Prediction result document | Kinematic vs statistical delay breakdown |
| `geoagent.analysis.created` | Server -> Client | GeoAgent structured reasoning | Operational reasoning layer (What, Why, Impact, Recommendation) |
| `decision.created` | Server -> Client | Decision proposal | Pending operator approval prompt |
| `decision.approved` | Server -> Client | Decision approval payload | Approved state indicator |
| `decision.rejected` | Server -> Client | Decision rejection payload | Rejected state with operator reason |
| `decision.executed` | Server -> Client | Execution summary & actions | Live reroute applied to driver navigation |
| `sms.submitted` / `sms.delivered` | Server -> Client | SMS delivery payload | Communication status indicator |

---

## 3. Backend REST API Preservation

All existing endpoints in `server/modules` remain 100% active and untouched or enhanced with strict backward compatibility:
- `GET /api/health`, `GET /api/health/providers`
- `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/vehicles`, `GET /api/vehicles/:id`
- `GET /api/emergencies`, `GET /api/emergencies/:id`, `POST /api/emergencies/:id/send-status-sms`
- `GET /api/routes`, `GET /api/routes/:id`, `POST /api/routes/calculate`, `POST /api/routes/:id/accept-reroute`
- `GET /api/trajectories/:vehicleId/latest`, `GET /api/trajectories/:vehicleId/recent`
- `GET /api/incidents`, `GET /api/incidents/:id`
- `GET /api/analysis/vehicle/:vehicleId`, `GET /api/analysis/vehicle/:vehicleId/prediction`
- `GET /api/decisions/active`, `POST /api/decisions/:id/approve`, `POST /api/decisions/:id/reject`, `POST /api/decisions/:id/execute`
- `GET /api/admin/prediction-analytics`, `GET /api/admin/system-stats`
