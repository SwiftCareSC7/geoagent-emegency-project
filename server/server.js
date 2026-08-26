import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import connectDB from './config/db.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';

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


// --- Error Handling ---

// 404 Not Found Middleware (catches routes that don't exist)
app.use(notFoundHandler);

// Centralized Error Handling Middleware (catches unhandled errors)
app.use(errorHandler);


// --- Start Server ---
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
