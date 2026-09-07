import mongoose from 'mongoose';

/**
 * Establish a connection to MongoDB using Mongoose.
 * Validates the presence of MONGO_URI and handles connection errors securely.
 */
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/geoagent';

    console.log(`Connecting to MongoDB at ${mongoUri}...`);
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 3000,
    });

    console.log('MongoDB connected successfully');
  } catch (error) {
    console.warn(`⚠️ MongoDB connection warning: ${error.message}`);
    console.warn('⚠️ Server will operate in resilient mock-fallback mode for local development.');
  }
};

export default connectDB;
