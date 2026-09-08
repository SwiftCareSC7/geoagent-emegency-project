# ─────────────────────────────────────────────────────────
# SwiftCare GeoAgent — Backend Production Dockerfile
# Multi-stage build for minimal image size
# ─────────────────────────────────────────────────────────

# Stage 1: Install dependencies
FROM node:22-slim AS builder

WORKDIR /app

# Copy only package files first for better layer caching
COPY package.json package-lock.json* ./

# Install production dependencies only
RUN npm ci --omit=dev --ignore-scripts

# ─────────────────────────────────────────────────────────
# Stage 2: Production runtime
FROM node:22-slim AS runner

# Security: run as non-root user
USER node

WORKDIR /app

# Copy production node_modules from builder
COPY --from=builder --chown=node:node /app/node_modules ./node_modules

# Copy application source
COPY --chown=node:node . .

# Cloud Run provides PORT via environment variable
# Default to 8080 for local Docker runs
ENV PORT=8080
EXPOSE ${PORT}

# Health check for container orchestrators
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 8080) + '/api/health/live').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Start the production server
CMD ["node", "server.js"]
