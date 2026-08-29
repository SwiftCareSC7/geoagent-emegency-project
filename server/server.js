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
import realtimeService from './modules/realtime/realtime.service.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Initialize Express app
const app = express();

// --- Security & Middleware ---

// Use Helmet to set appropriate security headers
app.use(helmet());

// Configure CORS securely
// We restrict access to the explicitly defined CLIENT_URL instead of allowing '*'
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Parse incoming JSON requests safely
app.use(express.json());

// Parse HTTP-only cookies
app.use(cookieParser());


// --- Routes ---

/**
 * Basic health endpoint
 * Returns a safe status message without leaking any internal details.
 */
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'GeoAgentic backend is running'
  });
});

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

server.listen(PORT, () => {
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


