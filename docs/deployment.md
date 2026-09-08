# Production Deployment Guide

This guide covers deploying the SwiftCare GeoAgent system to production:
- **Backend**: Google Cloud Run (containerized Node.js)
- **Frontend**: Vercel (Next.js)
- **Database**: MongoDB Atlas (managed)

---

## Architecture Overview

```text
Developer
   ↓ git push
GitHub
   ↓ GitHub Actions
   ├── CI: lint, typecheck, build, docker verify
   └── Deploy: docker build → Artifact Registry → Cloud Run

Cloud Run (Backend)
   ├── Node.js / Express / Socket.IO
   ├── Google Routes API
   ├── Google Roads API
   └── Gemini 2.5 Flash
   ↓
MongoDB Atlas

Vercel (Frontend)
   └── Next.js → Cloud Run API
```

---

## 1. Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | 22.x | Runtime |
| Docker | Latest | Container builds |
| gcloud CLI | Latest | GCP management |
| Vercel CLI | Latest | Frontend deployment |
| MongoDB Atlas | Free tier+ | Database |
| GitHub | — | Source + CI/CD |

---

## 2. Local Development Setup

```bash
# Clone the repository
git clone https://github.com/<org>/geoagent-emegency-project.git
cd geoagent-emegency-project

# Frontend setup
cp .env.example .env.local
npm install

# Backend setup
cp server/.env.example server/.env
# Edit server/.env with your MongoDB URI and JWT_SECRET
cd server && npm install && cd ..

# Start both (separate terminals)
npm run dev          # Frontend on :3000
cd server && npm run dev  # Backend on :5000
```

---

## 3. MongoDB Atlas Setup

### 3.1 Create Cluster
1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a free M0 cluster (or M2/M10 for production)
3. Select a region close to your Cloud Run region

### 3.2 Configure Access
1. **Database User**: Create a user with `readWrite` role on the `geoagent-emergency` database
2. **Network Access**: Add `0.0.0.0/0` for Cloud Run (Cloud Run IPs are dynamic) or configure VPC peering for production
3. **Connection String**: Copy the `mongodb+srv://` URI

### 3.3 Verify Indexes
The Mongoose models automatically create indexes on first connection. Verify these exist:
- `users`: `{ email: 1 }` (unique)
- `vehicles`: `{ vehicleId: 1 }`, `{ registrationNumber: 1 }`
- `emergencies`: `{ location: '2dsphere' }`
- `trajectories`: `{ vehicle: 1, timestamp: -1 }`
- `decisions`: `{ emergency: 1, situationHash: 1 }`

---

## 4. Google Cloud Setup

### 4.1 Create Project
```bash
gcloud projects create geoagent-prod --name="GeoAgent Production"
gcloud config set project geoagent-prod
```

### 4.2 Enable APIs
```bash
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  iam.googleapis.com \
  secretmanager.googleapis.com
```

### 4.3 Create Artifact Registry
```bash
gcloud artifacts repositories create geoagent \
  --repository-format=docker \
  --location=asia-south1 \
  --description="GeoAgent Docker images"
```

### 4.4 Setup Workload Identity Federation (CI/CD)

This allows GitHub Actions to authenticate without long-lived service account keys.

```bash
# Create service account
gcloud iam service-accounts create geoagent-deployer \
  --display-name="GeoAgent CI/CD Deployer"

# Grant permissions
PROJECT_ID=$(gcloud config get-value project)
SA_EMAIL="geoagent-deployer@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser"

# Create Workload Identity Pool
gcloud iam workload-identity-pools create github-pool \
  --location="global" \
  --display-name="GitHub Actions Pool"

# Create Provider
gcloud iam workload-identity-pools providers create-oidc github-provider \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub OIDC" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# Allow GitHub repo to impersonate SA
REPO="<org>/geoagent-emegency-project"
gcloud iam service-accounts add-iam-policy-binding $SA_EMAIL \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')/locations/global/workloadIdentityPools/github-pool/attribute.repository/${REPO}"
```

---

## 5. Cloud Run Deployment

### 5.1 Manual Deployment (First Time)

```bash
cd server

# Build
docker build -t asia-south1-docker.pkg.dev/$PROJECT_ID/geoagent/geoagent-backend:latest .

# Push
gcloud auth configure-docker asia-south1-docker.pkg.dev --quiet
docker push asia-south1-docker.pkg.dev/$PROJECT_ID/geoagent/geoagent-backend:latest

# Deploy
gcloud run deploy geoagent-backend \
  --image=asia-south1-docker.pkg.dev/$PROJECT_ID/geoagent/geoagent-backend:latest \
  --region=asia-south1 \
  --port=8080 \
  --min-instances=1 \
  --max-instances=1 \
  --cpu=1 \
  --memory=512Mi \
  --timeout=300 \
  --concurrency=80 \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production" \
  --set-env-vars="ROUTING_PROVIDER=mock" \
  --set-env-vars="TRAFFIC_PROVIDER=mock" \
  --update-secrets="MONGO_URI=geoagent-mongo-uri:latest,JWT_SECRET=geoagent-jwt-secret:latest"
```

### 5.2 Store Secrets in Secret Manager
```bash
echo -n "mongodb+srv://user:pass@cluster.mongodb.net/geoagent-emergency" | \
  gcloud secrets create geoagent-mongo-uri --data-file=-

echo -n "$(openssl rand -base64 64)" | \
  gcloud secrets create geoagent-jwt-secret --data-file=-

# Grant Cloud Run access
gcloud secrets add-iam-policy-binding geoagent-mongo-uri \
  --member="serviceAccount:$(gcloud iam service-accounts list --format='value(email)' --filter='displayName:Compute Engine default')" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding geoagent-jwt-secret \
  --member="serviceAccount:$(gcloud iam service-accounts list --format='value(email)' --filter='displayName:Compute Engine default')" \
  --role="roles/secretmanager.secretAccessor"
```

### 5.3 Health Verification
```bash
SERVICE_URL=$(gcloud run services describe geoagent-backend --region=asia-south1 --format='value(status.url)')

# Liveness (process alive)
curl ${SERVICE_URL}/api/health/live

# Readiness (MongoDB connected)
curl ${SERVICE_URL}/api/health/ready

# Full health (version, uptime, commit)
curl ${SERVICE_URL}/api/health

# Provider health (Google, Gemini, MongoDB)
curl ${SERVICE_URL}/api/health/providers
```

---

## 6. Vercel Frontend Deployment

### 6.1 Link to Vercel
```bash
npx vercel link
```

### 6.2 Configure Environment Variables
In the Vercel dashboard → Project → Settings → Environment Variables:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://geoagent-backend-XXXX-XX.a.run.app/api` |
| `NEXT_PUBLIC_SOCKET_URL` | `https://geoagent-backend-XXXX-XX.a.run.app` |

### 6.3 Deploy
```bash
# Production deployment
npx vercel --prod
```

Subsequent deploys happen automatically on push to `main` if Vercel GitHub integration is enabled.

---

## 7. GitHub Actions Setup

### 7.1 Required Secrets
In GitHub → Repository → Settings → Secrets:

| Secret | Value |
|---|---|
| `GCP_PROJECT_ID` | Your GCP project ID |
| `GCP_REGION` | `asia-south1` (or your region) |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/<number>/locations/global/workloadIdentityPools/github-pool/providers/github-provider` |
| `GCP_SERVICE_ACCOUNT` | `geoagent-deployer@<project>.iam.gserviceaccount.com` |

### 7.2 Workflow Behavior
- **CI** (`.github/workflows/ci.yml`): Runs on every push/PR — lint, typecheck, build, Docker verify
- **Deploy** (`.github/workflows/deploy.yml`): Runs on push to `main` when `server/**` changes — build, push, deploy to Cloud Run

---

## 8. Socket.IO Production Constraints

Socket.IO uses an **in-memory adapter**. This means:

| Constraint | Impact |
|---|---|
| Single instance only | `--max-instances=1` required |
| No horizontal scaling | One process handles all connections |
| Cold start reconnection | Clients auto-reconnect (configured with 15 retries) |

**Future scaling**: Add `@socket.io/redis-adapter` and a Redis instance to enable multi-instance broadcasting.

---

## 9. Python Routing Engine

The Python spatial routing engine (`/routing-engine/`) is a standalone analysis tool. It is **not** containerized or deployed as part of the production system. The Node.js backend handles all routing via the configurable provider system (mock/Google/Mapbox/OSRM).

---

## 10. Rollback Procedure

Cloud Run maintains revision history. To rollback:

```bash
# List revisions
gcloud run revisions list --service=geoagent-backend --region=asia-south1

# Route traffic to a previous revision
gcloud run services update-traffic geoagent-backend \
  --to-revisions=geoagent-backend-00005-xyz=100 \
  --region=asia-south1
```

---

## 11. Cost Control

| Service | Expected Cost |
|---|---|
| Cloud Run (1 instance, 1 CPU, 512MB) | ~$15–25/month |
| MongoDB Atlas M0 (free tier) | $0 |
| Artifact Registry | ~$1–3/month |
| Vercel (Hobby) | $0 |
| Google Routes API | Pay per request |
| Gemini API | Pay per request |

To minimize costs:
- Use `--min-instances=0` (accept cold starts) instead of `--min-instances=1`
- Use mock routing/traffic providers until production traffic warrants live APIs
