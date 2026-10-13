# SwiftCare GeoAgent — Security Architecture & Guidelines

This document details the security posture, defensive controls, and data protection mechanisms implemented across the **SwiftCare GeoAgent Emergency Response System**.

For the root security disclosure policy, see [SECURITY.md](file:///Users/priyanshu/Documents/geoagent-emegency-project/SECURITY.md).

---

## 1. Security Architecture Principles

SwiftCare operates under a **defense-in-depth** model tailored for mission-critical emergency operations:

```
[ Ingress: Gitleaks CI Secret Scanning + Helmet + CORS Whitelist ]
                             │
                             ▼
[ Transport: httpOnly Secure JWT Cookie + TLS 1.3 / HTTPS ]
                             │
                             ▼
[ Auth & RBAC: 12-round bcrypt + Registration Quarantining (PENDING) ]
                             │
                             ▼
[ Resource Ownership: Driver telemetry locked to assigned vehicle ]
                             │
                             ▼
[ Application Logic: Dual-Engine Authority + Epistemic AI Guardrails ]
                             │
                             ▼
[ Database Guard: dbSafety.js blocking destructive Atlas mutations ]
```

---

## 2. Secrets Management & Zero-Credential Policy

- **No Secrets in Source Control**: All API keys, database credentials, and session secrets are managed exclusively through gitignored `.env` files.
- **Automated Scanning in CI**: The GitHub Actions pipeline runs [Gitleaks](https://github.com/gitleaks/gitleaks) on every push and pull request against the repository history.
- **Graceful Cloud Fallback**: Cloud integrations (Google Routes, OpenRouter, MSG91) are strictly optional. In their absence, offline local algorithms (OSRM, deterministic rules, simulation fallbacks) execute seamlessly without runtime exceptions or missing credential crashes.

---

## 3. AI Safety & Prompt Injection Mitigation

The GeoAgent component employs strict guardrails to prevent LLM hallucinations, resource exhaustion, or adversarial injection attacks:

| Threat Vector | Mitigation in `geoAgent.service.js` & `geoagent.provider.js` |
|---|---|
| **Autonomous Action Dispatches** | **Hard Separation**: GeoAgent output is strictly advisory. Operational decisions are produced and executed only by the deterministic Decision Engine and require explicit human operator approval. |
| **Prompt Injection Attacks** | **Parameter Escaping**: Untrusted user inputs, patient names, and caller notes are strictly treated as data string literals in function-calling tool parameters and never concatenated directly into system instructions. |
| **Tool Execution Loops** | **Hard Execution Budgets**: Bounded multi-step tool loop enforcing: max 6 rounds, max 3 tool calls per round, max 8 total tool calls, and an 8-second timeout per tool. |
| **Duplicate Tool Flooding** | **Stable Hashing**: Identical tool calls within a run are deduplicated using stable argument hashes. |
| **Unbounded Cloud Invoicing** | **Strict Free-Tier Price Guard**: Providers query only catalog-confirmed $0.00 free models (e.g. models with zero prompt/completion price or `-free` suffix). Configured paid models are rejected at runtime. |

---

## 4. Database Safety Guard (`dbSafety.js`)

To prevent accidental data loss during local development, demo resets, or testing:
- Operations such as `deleteMany()` or `dropDatabase()` against remote MongoDB clusters (such as MongoDB Atlas `mongodb+srv://`) are intercepted and blocked by `server/shared/utils/dbSafety.js`.
- Destructive commands require an explicit environment variable override (`ALLOW_DESTRUCTIVE_DB_OPS=true`) and are restricted to local test databases (`geoagent-emergency-test`).

---

## 5. Input Validation & Telemetry Sanitization

Every incoming telemetry packet is sanitized before insertion into the database:
- **Coordinate Bounds**: Longitude constrained to `[-180, 180]`; Latitude constrained to `[-90, 90]`.
- **Speed Validation**: Speed clamped to realistic bounds `[0, 250]` km/h.
- **Heading Bounds**: Bearing constrained to `[0, 360]` degrees.
- **Jitter Anomaly Filter**: Teleportation jumps exceeding 1000m within 10 seconds are flagged as GPS anomalies and filtered out of cross-track calculations.
- **Retention Lifecycle**: Trajectories feature a 90-day MongoDB TTL index (`TELEMETRY_RETENTION_DAYS`) to prevent unbounded database growth.

---

## 6. Authentication & Resource Ownership

- **Password Storage**: Passwords are hashed using `bcryptjs` with 12 salt rounds.
- **Session Tokens**: JWT tokens are signed using HMAC-SHA256 with 24-hour expiration, stored in `httpOnly`, `sameSite: 'lax'` cookies.
- **Public Registration Quarantine**: Publicly created accounts default to `status: 'PENDING'` with zero permitted workspaces until activated by an administrator via `/admin`.
- **Ambulance Ownership Middleware**: The `ownershipMiddleware.js` verifies that an authenticated ambulance driver cannot submit telemetry or mutate state for any vehicle other than their assigned `assignedVehicleId`.

---

## 7. Vulnerability Disclosure

If you discover a security issue or potential vulnerability in SwiftCare GeoAgent:
1. Contact the security team at **`security@swiftcare.local`** or open a private GitHub Security Advisory.
2. Include reproduction steps, affected endpoints, and payload examples.
3. Initial response is provided within 24 hours.
