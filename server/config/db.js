import mongoose from 'mongoose';

/**
 * Normalise and validate a MongoDB URI without ever echoing it.
 * Dashboards often paste a stray leading/trailing space or newline; that is trimmed.
 * Anything else malformed (quotes, placeholder, wrong scheme) is rejected with a sanitized message.
 */
export const resolveMongoUri = (raw) => {
  if (typeof raw !== 'string' || raw.trim() === '') throw new Error('MONGO_URI is empty or not set');
  const uri = raw.trim();
  if (!/^mongodb(\+srv)?:\/\//.test(uri)) {
    const hint = /^["']/.test(uri) ? ' (value is wrapped in quotes; remove them)' : '';
    throw new Error(`MONGO_URI must start with mongodb:// or mongodb+srv://${hint}`);
  }
  if (/[<>]/.test(uri)) throw new Error('MONGO_URI contains < or > (placeholder brackets left around the password?)');
  const ws = uri.match(/\s/);
  if (ws) {
    // Report only the kind and the section (never the value) so the fix is findable.
    const at = ws.index;
    const section = at < uri.indexOf('@') ? 'username/password section' : at < uri.indexOf('?') || !uri.includes('?') ? 'host/database section' : 'options (?...) section';
    const kind = ws[0] === '\n' || ws[0] === '\r' ? 'a line break' : ws[0] === '\t' ? 'a tab' : 'a space';
    throw new Error(`MONGO_URI contains ${kind} in the ${section}`);
  }
  return uri;
};

/**
 * Establish a connection to MongoDB using Mongoose.
 * Validates the presence of MONGO_URI and handles connection errors securely.
 */
const connectDB = async () => {
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    const mongoUri = resolveMongoUri(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/geoagent');

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
