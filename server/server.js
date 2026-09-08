import http from 'http';
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import connectDB from './config/db.js';
import { errorHandler, notFoundHandler } from './shared/middleware/errorHandler.js';
import authRoutes from './modules/auth/auth.routes.js';
import vehicleRoutes from './modules/vehicles/vehicle.routes.js';
import emergencyRoutes from './modules/emergencies/emergency.routes.js';
import incidentRoutes from './modules/incidents/incident.routes.js';
import trajectoryRoutes from './modules/trajectories/trajectory.routes.js';
import routeRoutes from './modules/routes/route.routes.js';
import deviationRoutes from './modules/deviation/deviation.routes.js';
import trafficRoutes from './modules/traffic/traffic.routes.js';
import analysisRoutes from './modules/analysis/analysis.routes.js';
import geoagentRoutes from './modules/geoagents/geoagent.routes.js';
import decisionRoutes from './modules/decisions/decision.routes.js';
import orchestrationRoutes from './modules/orchestration/orchestration.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import realtimeService from './modules/realtime/realtime.service.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

// --- Environment Validation ---
const validateEnvironment = () => {
  const env = process.env.NODE_ENV || 'development';
  const required = ['JWT_SECRET', 'MONGO_URI'];
  const missing = required.filter((v) => !process.env[v]);

  if (env === 'production' && missing.length > 0) {
    console.error(`❌ FATAL: Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  } else if (missing.length > 0) {
    console.warn(`⚠️  Missing environment variables (non-fatal in ${env}): ${missing.join(', ')}`);
  }

  // Log provider configuration (never log actual keys)
  const routing = process.env.ROUTING_PROVIDER || 'mock';
  const traffic = process.env.TRAFFIC_PROVIDER || 'mock';
  const geminiConfigured = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key';
  const googleConfigured = !!process.env.GOOGLE_MAPS_API_KEY && process.env.GOOGLE_MAPS_API_KEY !== 'your_google_maps_key';

  console.log(`[Config] NODE_ENV=${env}, ROUTING=${routing}, TRAFFIC=${traffic}`);
  console.log(`[Config] Google API: ${googleConfigured ? 'configured' : 'not configured'}, Gemini: ${geminiConfigured ? 'configured' : 'not configured'}`);
};

validateEnvironment();

// Connect to MongoDB
connectDB();

// Initialize Express app
const app = express();

import providerHealthService from './modules/health/providerHealth.service.js';

// --- Security & Middleware ---

// Use Helmet to set appropriate security headers
app.use(helmet());

// Configure CORS securely
// Support both Next.js frontend (port 3000) and legacy Vite (port 5173) or custom CLIENT_URL
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'http://localhost:5173',
  // Vercel deployments — auto-allow any *.vercel.app subdomain
  /^https:\/\/.*\.vercel\.app$/
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    // Check exact matches and regex patterns (for Vercel subdomains)
    const isAllowed = allowedOrigins.some((allowed) => {
      if (typeof allowed === 'string') return allowed === origin;
      if (allowed instanceof RegExp) return allowed.test(origin);
      return false;
    });
    if (isAllowed) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Parse incoming JSON requests safely
app.use(express.json());

// Parse HTTP-only cookies
app.use(cookieParser());


// --- Health & Observability Routes ---

const startedAt = new Date().toISOString();

/**
 * Basic health endpoint with safe version info
 * Returns application metadata without leaking secrets.
 */
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'GeoAgentic backend is running',
    version: '2.0.0',
    commit: process.env.COMMIT_SHA || 'unknown',
    environment: process.env.NODE_ENV || 'development',
    uptime: Math.floor(process.uptime()),
    startedAt
  });
});

/**
 * Liveness probe — process is alive and can handle requests.
 * Cloud Run / container orchestrators use this to detect crashed processes.
 * Must NOT depend on external services (MongoDB, Google APIs, etc.).
 */
app.get('/api/health/live', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

/**
 * Readiness probe — application can serve normal traffic.
 * Returns 503 if MongoDB is disconnected.
 */
app.get('/api/health/ready', (req, res) => {
  const mongoState = mongoose.connection.readyState;
  // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
  if (mongoState === 1) {
    return res.status(200).json({ status: 'ready', database: 'connected' });
  }
  return res.status(503).json({ status: 'not_ready', database: 'disconnected' });
});

/**
 * Provider health endpoint
 * Returns safe health statuses (AVAILABLE, DEGRADED, UNAVAILABLE, NOT_CONFIGURED)
 * for Google Routes, Google Roads, and Gemini AI without leaking keys or secrets.
 */
app.get('/api/health/providers', async (req, res) => {
  try {
    const health = await providerHealthService.getHealthStatus();
    res.status(200).json({
      success: true,
      data: health
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to evaluate provider health'
    });
  }
});

// --- Domain Routes ---

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/emergencies', emergencyRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/trajectories', trajectoryRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/deviation', deviationRoutes);
app.use('/api/traffic', trafficRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/geoagent', geoagentRoutes);
app.use('/api/decisions', decisionRoutes);
app.use('/api/orchestration', orchestrationRoutes);
app.use('/api/admin', adminRoutes);




// --- Error Handling ---

// 404 Not Found Middleware (catches routes that don't exist)
app.use(notFoundHandler);

// Centralized Error Handling Middleware (catches unhandled errors)
app.use(errorHandler);


// --- Create HTTP Server & Initialize Socket.IO ---
const server = http.createServer(app);
realtimeService.init(server, {
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173'
});

const PORT = process.env.PORT || 5000;

// Bind to 0.0.0.0 for Cloud Run / container networking
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// --- Graceful Shutdown ---
const gracefulShutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  try {
    server.close(() => {
      console.log('HTTP server closed.');
    });
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
    process.exit(0);
  } catch (err) {
    console.error(`Error during graceful shutdown: ${err.message}`);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));


