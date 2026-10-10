/**
 * SwiftCare Database Safety Guard
 * Detects whether the current MongoDB connection target is a production or shared database,
 * and prevents accidental execution of destructive wipes or drops.
 */

export function isSafeDevelopmentDatabase(uri = process.env.MONGO_URI || '') {
  if (!uri) return false;
  const lower = uri.toLowerCase();

  // Explicit production flags
  if (process.env.NODE_ENV === 'production') return false;

  // Cloud hosted or production clusters
  if (
    lower.includes('mongodb+srv://') ||
    lower.includes('.mongodb.net') ||
    lower.includes('production') ||
    lower.includes('prod-db') ||
    lower.includes('live-db')
  ) {
    return false;
  }

  // Safe local patterns: localhost or 127.0.0.1 or test
  const isLocal = lower.includes('localhost') || lower.includes('127.0.0.1');
  const isTestDb = lower.includes('test') || lower.includes('dev') || lower.includes('demo');

  return isLocal || isTestDb;
}

export function assertSafeDatabaseTarget(operationName, uri = process.env.MONGO_URI || '') {
  if (process.env.ALLOW_PRODUCTION_RESET === 'true') {
    return true;
  }

  if (!isSafeDevelopmentDatabase(uri)) {
    const errorMsg = `[DB SAFETY VIOLATION] Refusing to execute destructive operation "${operationName}" on target URI: "${uri}". Database appears to be a remote, production, or unverified cluster. Set ALLOW_PRODUCTION_RESET=true only if you are completely certain.`;
    console.error(`\n❌ ${errorMsg}\n`);
    throw new Error(errorMsg);
  }

  return true;
}
