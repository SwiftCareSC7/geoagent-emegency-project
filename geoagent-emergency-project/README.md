# SwiftCare GeoAgent — Subdirectory Note

> [!NOTE]
> The active, production **SwiftCare GeoAgent** application (Next.js 16 App Router, React 19, Tailwind CSS v4, Tactical Command Design) is hosted at the **repository root**:
> - `/app`: App router pages:
>   - `/` — Landing page & operational core loop
>   - `/login`, `/signup` — Authentication & role-based access control (RBAC)
>   - `/control-room` — Master dispatcher console with 5-Question Mission Assessment HUD
>   - `/control-room/overview` — Multi-Mission Operations Overview & Quick-Dispatch Intake
>   - `/driver/dashboard` — In-vehicle tactical navigation HUD & maneuver vectors
>   - `/emergencies/[id]` — Deep corridor intelligence & epistemic reasoning
>   - `/paramedic` — Pre-hospital clinical triage & trauma bay synchronization
>   - `/emergency-lab` — Interactive 18-scenario simulation workbench
>   - `/diff` — Map-first what-if route comparison and scenario simulator
>   - `/admin` — System health, collection explorer & prediction analytics
> - `/components`: Tactical UI widgets, maps & dashboard modules
> - `/lib`: Centralized typed API client (`lib/api`) & Socket.IO hooks
> - `/server`: Node.js + Express + MongoDB backend with free-model AI provider abstraction
> - `/routing-engine`: Python spatial routing, deviation detection & V2X engine
>
> To run the full-stack application:
> ```bash
> cd ..
> # Terminal 1 - Frontend (port 3000):
> npm install
> npm run dev
>
> # Terminal 2 - Backend (port 5001):
> cd server && npm install && npm run dev
> ```
>
> Visit [http://localhost:3000](http://localhost:3000) for the Next.js frontend and [http://localhost:5001/api/health](http://localhost:5001/api/health) for backend status.

