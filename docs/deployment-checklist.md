# Deployment Checklist

Use this checklist before and after deploying to production.

---

## Pre-Deployment Checklist

### Infrastructure
- [ ] MongoDB Atlas cluster is created and accessible
- [ ] MongoDB database user has `readWrite` on `geoagent-emergency`
- [ ] MongoDB network access allows Cloud Run IPs (`0.0.0.0/0` or VPC peering)
- [ ] GCP project is created with required APIs enabled
- [ ] Artifact Registry repository exists
- [ ] Workload Identity Federation is configured for GitHub Actions
- [ ] Cloud Run service account has Secret Manager access

### Secrets
- [ ] `MONGO_URI` stored in GCP Secret Manager
- [ ] `JWT_SECRET` stored in GCP Secret Manager (minimum 64 chars, random)
- [ ] `GEMINI_API_KEY` stored in GCP Secret Manager (if using Gemini)
- [ ] `GOOGLE_MAPS_API_KEY` stored in GCP Secret Manager (if using Google routing)
- [ ] GitHub Secrets configured: `GCP_PROJECT_ID`, `GCP_REGION`, and either (`GCP_WORKLOAD_IDENTITY_PROVIDER` + `GCP_SERVICE_ACCOUNT`) or `GCP_SA_KEY`
- [ ] No secrets in committed code (grep: `mongodb+srv://`, API keys)

### Configuration
- [ ] `NODE_ENV=production` set in Cloud Run env vars
- [ ] `CLIENT_URL` set to Vercel production URL
- [ ] Vercel env vars set: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SOCKET_URL`
- [ ] Cloud Run `--min-instances=1 --max-instances=1` (Socket.IO constraint)

### Code
- [ ] `npm run build` passes (frontend)
- [ ] `npx tsc --noEmit` passes (TypeScript)
- [ ] `docker build` succeeds (backend)
- [ ] No `console.log` of secrets in server code

---

## Post-Deployment Checklist

### Health Verification
- [ ] `GET /api/health/live` → `200 { status: "ok" }`
- [ ] `GET /api/health/ready` → `200 { status: "ready", database: "connected" }`
- [ ] `GET /api/health` → `200 { version, commit, environment: "production" }`
- [ ] `GET /api/health/providers` → MongoDB: AVAILABLE

### Functional Verification
- [ ] User can register via frontend
- [ ] User can log in (cookie set)
- [ ] User can view dashboard after login
- [ ] Socket.IO connects from frontend to backend
- [ ] Create an emergency and verify it appears in control room
- [ ] CORS: no cross-origin errors in browser console

### Security Verification
- [ ] Login cookie has: `HttpOnly=true`, `Secure=true`, `SameSite=None`
- [ ] `/api/health` does NOT expose `MONGO_URI` or any API keys
- [ ] `/api/health/providers` shows status without credentials
- [ ] 404 and 500 errors do NOT return stack traces
- [ ] Admin endpoints return 403 for non-ADMIN users

### Monitoring
- [ ] Cloud Run logs are accessible in Cloud Logging
- [ ] MongoDB Atlas metrics are visible
- [ ] Vercel deployment logs are accessible

---

## Rollback Procedure

If issues are detected after deployment:

```bash
# 1. List available revisions
gcloud run revisions list --service=geoagent-backend --region=<REGION>

# 2. Route 100% traffic to last known good revision
gcloud run services update-traffic geoagent-backend \
  --to-revisions=<REVISION_NAME>=100 \
  --region=<REGION>

# 3. Verify rollback
curl https://<SERVICE_URL>/api/health
```
