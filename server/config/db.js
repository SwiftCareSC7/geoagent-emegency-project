import mongoose from 'mongoose';

/**
 * Establish a connection to MongoDB using Mongoose.
 * Validates the presence of MONGO_URI and handles connection errors securely.
 */
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
      console.error('Error: MONGO_URI environment variable is missing.');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);

    console.log('MongoDB connected successfully');
  } catch (error) {
    // Log a useful server-side error, but do NOT expose credentials
    console.error(`Error connecting to MongoDB: ${error.message}`);
    // Terminate the server safely
    process.exit(1);
  }
};

export default connectDB;
