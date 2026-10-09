# Security Policy

## Supported Versions

The following table lists the active and supported versions of the **SwiftCare GeoAgent** platform receiving security patches:

| Version | Supported          | Status |
| ------- | ------------------ | ------ |
| 2.8.x   | :white_check_mark: | Current Stable Release (Hardened RBAC, DB Safety, Rate Limiting) |
| 2.7.x   | :white_check_mark: | Supported (Multi-Workspace RBAC) |
| 2.6.x   | :x:                | Deprecated |
| < 2.6   | :x:                | Unsupported |

## Security Architecture & Protections

SwiftCare GeoAgent incorporates security-in-depth principles across its full stack:
- **Authentication**: Passwords hashed with bcrypt (12 salt rounds); sessions managed via `httpOnly`, `sameSite: 'lax'` JWT cookies.
- **Role-Based Access Control**: Strict role verification (`ADMIN`, `CONTROL_ROOM`, `DRIVER`, `PARAMEDIC`) across both Next.js App Router and Express route handlers.
- **Account Quarantining**: Public registrations default strictly to `status: 'PENDING'` with zero permitted workspaces until approved by an administrator via `/admin`.
- **Resource Ownership**: Ambulance drivers are restricted from mutating or broadcasting telemetry for unassigned vehicles via `ownershipMiddleware.js`.
- **Rate Limiting**: Sliding-window rate limiting on authentication routes (30 requests / 15 minutes) and AI analysis (30 requests / 1 minute) via `server/shared/middleware/rateLimiter.js`.
- **Database Safety Guard**: Destructive operations (`deleteMany()`, `dropDatabase()`) against remote or production MongoDB Atlas clusters are blocked by `server/shared/utils/dbSafety.js` unless explicitly overridden.
- **Continuous Secret Auditing**: Automated secret scanning using Gitleaks runs on all pull requests and commits via `.github/workflows/ci.yml`.

## Reporting a Vulnerability

If you discover a security vulnerability within SwiftCare GeoAgent, please do not open a public issue. Instead, submit a responsible disclosure report to the security team:

1. **Email Contact**: Send vulnerability details to `security@swiftcare.local` (or file a private GitHub Security Advisory).
2. **Report Contents**: Include a summary of the issue, affected endpoint or component, step-by-step reproduction instructions, and proof-of-concept payload if applicable.
3. **Response Timeline**:
   - Initial acknowledgement: within **24 hours**.
   - Severity assessment and triage: within **48 hours**.
   - Remediation patch and release: prioritized based on CVSS severity (critical vulnerabilities targeted within **7 days**).
4. **Disclosure Policy**: We ask that you maintain confidentiality until an official fix is merged and released.
