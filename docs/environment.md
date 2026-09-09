# Environment Variable Configuration

This document lists all environment variables used by the SwiftCare GeoAgentic Emergency Response System across backend and frontend tiers.

---

## 1. Backend Server & Database Variables (`server/.env`)

| Variable | Required? | Default | Purpose | Production Behavior |
|---|---|---|---|---|
| `PORT` | Optional | `5000` | Port on which the Express & Socket.IO server listens | Set by cloud provider (e.g. `8080`, `5000`) |
| `NODE_ENV` | Optional | `development` | Environment mode (`development`, `test`, `production`) | Enables strict security headers & cookie flags |
| `MONGO_URI` | **Required** | `mongodb://127.0.0.1:27017/geoagent-emergency` | MongoDB connection string | Managed MongoDB Atlas / replica set connection |
| `CLIENT_URL` | Optional | `http://localhost:3000` | Allowed CORS origin & Socket.IO allowed origin | Set to production frontend domain (e.g. `https://geoagent-emegency-project.vercel.app`) |

> **Security Rule**: `MONGO_URI` must **never** be exposed in client bundles or public endpoints. The Admin Console at `/admin` communicates strictly via Express APIs and never exposes database connection strings, credentials, or raw query capabilities.

---

## 2. Authentication Variables

| Variable | Required? | Default | Purpose | Production Behavior |
|---|---|---|---|---|
| `JWT_SECRET` | **Required** | None | Secret key used to sign and verify JWT tokens | Must be a long, cryptographically random string |
| `JWT_EXPIRES_IN` | Optional | `30d` | Lifetime duration of issued JWT tokens | Recommended `7d` or `24h` with refresh tokens |

---

## 3. GeoAgent AI (Google Gemini)

| Variable | Required? | Default | Purpose | Fallback Behavior |
|---|---|---|---|---|
| `GEMINI_API_KEY` | Optional | None | API Key for Google Gemini LLM SDK (`@google/genai`) | If missing or invalid, falls back to deterministic decision engine (`fallback: true`) |
| `GEMINI_MODEL` | Optional | `gemini-2.5-flash` | Gemini model name for function-calling reasoning | Uses fast multimodal/reasoning flash model |

---

## 4. Routing & Traffic Providers

| Variable | Required? | Default | Purpose | Fallback Behavior |
|---|---|---|---|---|
| `ROUTING_PROVIDER` | Optional | `mock` | Active routing provider (`mock`, `google`, `mapbox`, `osrm`) | Defaults to deterministic mock routing |
| `GOOGLE_MAPS_API_KEY`| Optional | None | API Key for Google Routes / Directions API | Required only when `ROUTING_PROVIDER=google` |
| `MAPBOX_ACCESS_TOKEN`| Optional | None | API Token for Mapbox Directions API | Required only when `ROUTING_PROVIDER=mapbox` |
| `TRAFFIC_PROVIDER` | Optional | `mock` | Active traffic provider (`mock`, `google`) | Defaults to deterministic mock traffic levels |
| `DEFAULT_FREE_FLOW_SPEED_KMH` | Optional | `45` | Fallback speed in km/h when telemetry/traffic is missing | Used for ETA arithmetic |

---

## 5. Threshold Configurations

| Variable | Required? | Default | Purpose |
|---|---|---|---|
| `ROUTE_WARNING_DISTANCE_METERS` | Optional | `50` | Distance threshold for `WARNING` deviation |
| `ROUTE_DEVIATION_DISTANCE_METERS`| Optional | `100` | Distance threshold for `DEVIATED` classification |
| `ROUTE_CRITICAL_DISTANCE_METERS` | Optional | `250` | Distance threshold for `CRITICAL_DEVIATION` |
| `BEARING_WARNING_DEGREES` | Optional | `30` | Bearing angle diff threshold for Warning |
| `BEARING_DEVIATION_DEGREES` | Optional | `60` | Bearing angle diff threshold for Deviation |
| `GPS_STABILITY_WINDOW` | Optional | `3` | Number of consecutive points evaluated for jitter stability |
| `INCIDENT_PROXIMITY_RADIUS_METERS` | Optional | `500` | Proximity radius to correlate road hazards with vehicle/route |

---

## 6. Frontend Environment Variables (`.env.local`)

| Variable | Required? | Default | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Optional | `http://localhost:5001/api` | Backend base REST API URL (supports port 5000 or 5001) |
| `NEXT_PUBLIC_SOCKET_URL` | Optional | `http://localhost:5001` | Backend Socket.IO server URL (supports port 5000 or 5001) |
| `NEXT_PUBLIC_CARTO_API_KEY` | Optional | None | CARTO basemap API key for browser raster tile loading without watermark |

> **Map Basemap Key Note**:
> CARTO provides free browser basemap API keys for development and operational dispatch (up to 5 million tile requests/month) at [carto.com/basemaps/apikey](https://carto.com/basemaps/apikey).
> Set `NEXT_PUBLIC_CARTO_API_KEY` in `.env.local` for local development and in the **Vercel Project Dashboard → Settings → Environment Variables** for production.
>
> **Security Rule**: `NEXT_PUBLIC_CARTO_API_KEY` is strictly a public browser client credential for rendering raster map tiles. **Never** prefix backend secrets (`GOOGLE_MAPS_API_KEY`, `GEMINI_API_KEY`, `MONGO_URI`, `JWT_SECRET`) with `NEXT_PUBLIC_`.

> **Local Development Note**:
> If the backend is running on port `5000` (the default in `server/server.js`), configure `NEXT_PUBLIC_API_URL=http://localhost:5000/api` and `NEXT_PUBLIC_SOCKET_URL=http://localhost:5000` in `.env.local` to match. If unconfigured or backend is offline, the frontend gracefully falls back to demonstration data fixtures.

---

## 7. Emergency SMS Notifications (MSG91)

| Variable | Required? | Default | Purpose | Production Behavior |
|---|---|---|---|---|
| `MSG91_PROVIDER` | Optional | `real` | Provider mode: `real` (telecom) or `mock` (webhook testing) | In `mock` mode, requests are safely sent to test endpoint |
| `MSG91_API_URL` | Optional | `https://control.msg91.com/api/v5/flow` | MSG91 Flow API endpoint | Can be pointed to a mock webhook for non-telecom testing |
| `MSG91_AUTH_KEY` | Optional | None | MSG91 API Authentication Key | Transmitted in `authkey` header. Never expose to client |
| `MSG91_FLOW_ID` | Optional | None | MSG91 Flow Template Identifier | Flow containing template variables (`vehicle`, `eta`, `hospital`) |
| `MSG91_SENDER_ID` | Optional | `SWFCARE` | Approved 6-character sender ID | Passed in flow dispatch payload |

> **Security Rule**: `MSG91_AUTH_KEY` is strictly a backend secret. Never prefix with `NEXT_PUBLIC_*` or transmit real credentials to mock webhooks.
