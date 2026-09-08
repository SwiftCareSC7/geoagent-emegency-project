/**
 * Provider Health Service
 *
 * Inspects external service configurations and returns non-sensitive health statuses:
 * AVAILABLE, DEGRADED, UNAVAILABLE, NOT_CONFIGURED.
 *
 * CRITICAL SECURITY: Never logs or exposes API keys or secrets in payloads.
 */

import mongoose from 'mongoose';

class ProviderHealthService {
  /**
   * Helper to check if a key is genuinely configured (not empty and not a placeholder)
   * @param {String|undefined} key
   * @param {Array<String>} placeholders
   * @returns {Boolean}
   */
  isConfigured(key, placeholders = []) {
    if (!key || typeof key !== 'string') return false;
    const trimmed = key.trim();
    if (trimmed.length === 0) return false;
    const defaultPlaceholders = [
      'your_google_maps_key',
      'your_gemini_api_key',
      'replace_with_a_long_random_secret',
      'your_mongodb_connection_string'
    ];
    const allPlaceholders = [...defaultPlaceholders, ...placeholders];
    return !allPlaceholders.includes(trimmed);
  }

  /**
   * Get health summary of all external providers
   * @returns {Object} Health status report
   */
  async getHealthStatus() {
    const routingProvider = (process.env.ROUTING_PROVIDER || 'mock').toLowerCase();
    const trafficProvider = (process.env.TRAFFIC_PROVIDER || 'mock').toLowerCase();
    const googleMapsConfigured = this.isConfigured(process.env.GOOGLE_MAPS_API_KEY);
    const geminiConfigured = this.isConfigured(process.env.GEMINI_API_KEY);
    const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    // 1. Google Routes API Health
    let googleRoutesStatus = 'NOT_CONFIGURED';
    let googleRoutesMessage = 'Google Maps API key is not configured';
    if (googleMapsConfigured) {
      googleRoutesStatus = 'AVAILABLE';
      googleRoutesMessage = 'Google Routes API key is configured server-side';
    } else if (routingProvider === 'mock') {
      googleRoutesStatus = 'DEGRADED';
      googleRoutesMessage = 'Running in mock routing fallback mode for development';
    }

    // 2. Google Roads API Health
    let googleRoadsStatus = 'NOT_CONFIGURED';
    let googleRoadsMessage = 'Google Roads API key not configured (Turf.js spatial fallback active)';
    if (googleMapsConfigured) {
      googleRoadsStatus = 'AVAILABLE';
      googleRoadsMessage = 'Google Roads API key is configured server-side';
    }

    // 3. Gemini AI Health
    let geminiStatus = 'NOT_CONFIGURED';
    let geminiMessage = 'Gemini API key is not configured (Deterministic rule fallback active)';
    if (geminiConfigured) {
      geminiStatus = 'AVAILABLE';
      geminiMessage = `Gemini reasoning layer ready (${geminiModel})`;
    }

    // 4. MongoDB Health (non-invasive readyState check)
    const mongoStateMap = { 0: 'UNAVAILABLE', 1: 'AVAILABLE', 2: 'CONNECTING', 3: 'DISCONNECTING' };
    const mongoState = mongoose.connection.readyState;
    const mongoStatus = mongoStateMap[mongoState] || 'UNKNOWN';

    return {
      timestamp: new Date().toISOString(),
      activeRoutingProvider: routingProvider,
      activeTrafficProvider: trafficProvider,
      providers: {
        mongodb: {
          provider: 'mongodb',
          status: mongoStatus,
          configured: true,
          message: mongoStatus === 'AVAILABLE' ? 'MongoDB connected' : `MongoDB state: ${mongoStatus}`
        },
        googleRoutes: {
          provider: 'google',
          status: googleRoutesStatus,
          configured: googleMapsConfigured,
          isActive: routingProvider === 'google',
          message: googleRoutesMessage
        },
        googleRoads: {
          provider: 'google-roads',
          status: googleRoadsStatus,
          configured: googleMapsConfigured,
          message: googleRoadsMessage
        },
        gemini: {
          provider: 'google-genai',
          model: geminiModel,
          status: geminiStatus,
          configured: geminiConfigured,
          message: geminiMessage
        }
      }
    };
  }
}

export default new ProviderHealthService();
