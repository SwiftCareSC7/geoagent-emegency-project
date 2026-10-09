/**
 * Provider Health Service
 *
 * Inspects external service configurations and returns non-sensitive health statuses:
 * AVAILABLE, DEGRADED, UNAVAILABLE, NOT_CONFIGURED.
 *
 * CRITICAL SECURITY: Never logs or exposes API keys or secrets in payloads.
 */

import { PROVIDERS } from '../geoagents/geoagent.provider.js';
import mongoose from 'mongoose';
import realtimeService from '../realtime/realtime.service.js';
import pythonRoutingBridge from '../routes/pythonRoutingBridge.service.js';
import geoAgentService from '../geoagents/geoAgent.service.js';

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
    // The GeoAgent LLM is OpenRouter/OpenCode (geoagent.provider.js), not Gemini; report what the agent really uses.
    // Key kept as `gemini` in the payload for frontend compatibility.
    const aiLabels = Object.values(PROVIDERS).filter((d) => this.isConfigured(process.env[d.keyEnv])).map((d) => d.label);
    const geminiConfigured = aiLabels.length > 0;
    const geminiModel = 'free models (auto-selected per request)';

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
    let geminiMessage = 'No LLM provider key (OPENROUTER_API_KEY / OPENCODE_API_KEY) configured (Deterministic rule fallback active)';
    if (geminiConfigured) {
      geminiStatus = 'AVAILABLE';
      geminiMessage = `LLM provider key configured: ${aiLabels.join(', ')} (not live-probed; deterministic fallback on failure)`;
    }

    // 4. MongoDB Health (non-invasive readyState check)
    const mongoStateMap = { 0: 'UNAVAILABLE', 1: 'AVAILABLE', 2: 'CONNECTING', 3: 'DISCONNECTING' };
    const mongoState = mongoose.connection.readyState;
    const mongoStatus = mongoStateMap[mongoState] || 'UNKNOWN';

    // 5. Python / V2X Engine Health
    const pythonCheck = pythonRoutingBridge.checkAvailability();

    // 6. Socket.IO Gateway Health
    const socketReady = realtimeService.isReady();
    const socketStatus = socketReady ? 'AVAILABLE' : 'UNAVAILABLE';
    const socketMessage = socketReady
      ? 'Socket.IO gateway initialized and accepting real-time connections'
      : 'Socket.IO server instance not yet attached';

    // 7. CARTO Basemap Provider Health
    const cartoKeyConfigured = this.isConfigured(process.env.CARTO_API_KEY || process.env.NEXT_PUBLIC_CARTO_API_KEY);
    const cartoStatus = cartoKeyConfigured ? 'AVAILABLE' : 'NOT_CONFIGURED';
    const cartoMessage = cartoKeyConfigured
      ? 'CARTO basemap API key is configured for browser tile requests'
      : 'CARTO basemap API key is not configured (NEXT_PUBLIC_CARTO_API_KEY)';

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
          provider: geminiConfigured ? aiLabels.join('+').toLowerCase() : 'none',
          model: geminiModel,
          status: geminiStatus,
          configured: geminiConfigured,
          message: geminiMessage
        },
        pythonV2X: {
          provider: 'python-v2x',
          status: pythonCheck.status,
          engine: pythonCheck.engine,
          configured: true,
          message: pythonCheck.message
        },
        socketIO: {
          provider: 'socket.io',
          status: socketStatus,
          configured: true,
          message: socketMessage
        },
        cartoBasemap: {
          provider: 'carto-dark-matter',
          status: cartoStatus,
          configured: cartoKeyConfigured,
          message: cartoMessage
        },
        // Free-model LLM providers (OpenCode / OpenRouter): last known state, no network call
        geoAgentAI: (() => {
          const models = geoAgentService.getAIHealth();
          return {
            provider: process.env.AI_PROVIDER || 'auto',
            status: models.length === 0 ? 'NOT_CONFIGURED' : (models.some((m) => m.available) ? 'AVAILABLE' : 'DEGRADED'),
            configured: models.length > 0,
            freeOnly: true,
            providers: models,
            message: models.length === 0
              ? 'No free AI provider key configured (deterministic fallback active)'
              : 'Free-model AI providers configured server-side'
          };
        })()
      }
    };
  }
}

export default new ProviderHealthService();
