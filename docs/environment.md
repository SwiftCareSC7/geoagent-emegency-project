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
| `NEXT_PUBLIC_API_URL` | Optional | `http://localhost:5000/api` | Backend base REST API URL |
| `NEXT_PUBLIC_SOCKET_URL` | Optional | `http://localhost:5000` | Backend Socket.IO server URL |
