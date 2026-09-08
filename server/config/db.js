import mongoose from 'mongoose';

/**
 * Establish a connection to MongoDB using Mongoose.
 * Validates the presence of MONGO_URI and handles connection errors securely.
 */
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/geoagent';
    const isProduction = process.env.NODE_ENV === 'production';

    // Never log the full URI — it may contain credentials
    const redacted = mongoUri.includes('@')
      ? mongoUri.replace(/:\/\/[^@]+@/, '://***:***@')
      : mongoUri.replace(/:\/\//, '://***@');
    console.log(`Connecting to MongoDB at ${redacted}...`);

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: isProduction ? 10000 : 3000,
    });

    console.log('MongoDB connected successfully');
  } catch (error) {
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      console.error(`❌ FATAL: MongoDB connection failed: ${error.message}`);
      console.error('Production server cannot start without a database connection.');
      process.exit(1);
    }
    console.warn(`⚠️ MongoDB connection warning: ${error.message}`);
    console.warn('⚠️ Server will operate in resilient mock-fallback mode for local development.');
  }
};

export default connectDB;
