import { GoogleGenAI } from '@google/genai';
import Emergency from '../emergencies/emergency.model.js';
import Vehicle from '../vehicles/vehicle.model.js';
import Route from '../routes/route.model.js';
import analysisService from '../analysis/analysis.service.js';
import predictionService from '../analysis/prediction.service.js';
import routingService from '../routes/routing.service.js';
import { geoAgentConstants } from './geoagent.constants.js';
import { geoAgentToolDeclarations, executeGeoAgentTool } from './geoagent.tools.js';
import { GEOAGENT_SYSTEM_PROMPT } from './prompts/geoagent.system.js';
import { validateGeoAgentOutput, sanitizeText } from './geoagent.schemas.js';
import realtimeService from '../realtime/realtime.service.js';


class GeoAgentService {
  /**
   * Initializes Gemini client if API key is provided
   * @returns {Object|null}
   */
  getAIClient() {
    if (!process.env.GEMINI_API_KEY) {
      return null;
    }
    return new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });
  }

  /**
   * Generates a deterministic fallback recommendation when AI is unavailable or unconfigured
   * @param {Object} situation Situation analysis object
   * @param {String} reason Reason for fallback
   * @returns {Object} Validated structured response
   */
  generateFallbackResponse(situation, reason = 'AI provider not configured') {
    const { vehicleId, emergencyId, deviation, eta, traffic, incidents } = situation;

    let action = geoAgentConstants.actions.CONTINUE;
    let likelyCause = geoAgentConstants.causes.UNKNOWN_FACTORS;

    if (deviation.status === 'CRITICAL_DEVIATION' || deviation.status === 'DEVIATED') {
      action = geoAgentConstants.actions.REROUTE;
      if (incidents && incidents.length > 0 && incidents[0].type === 'ACCIDENT') {
        likelyCause = geoAgentConstants.causes.ACCIDENT_INDUCED_CONGESTION;
      } else if (traffic && (traffic.level === 'HEAVY' || traffic.level === 'SEVERE')) {
        likelyCause = geoAgentConstants.causes.TRAFFIC_CONGESTION;
      } else {
        likelyCause = geoAgentConstants.causes.DRIVER_NAVIGATION_DEVIATION;
      }
    } else if (deviation.status === 'WARNING') {
      action = geoAgentConstants.actions.MONITOR;
      likelyCause = geoAgentConstants.causes.TRAFFIC_CONGESTION;
    }

    const safeEta = eta || { currentMinutes: 14, originalMinutes: 10, delayMinutes: 4 };
    const backupRecommended = safeEta.delayMinutes >= 10;

    return {
      status: 'AI_ANALYSIS_UNAVAILABLE',
      vehicleId,
      emergencyId: emergencyId || 'STANDBY',
      assessment: {
        routeStatus: deviation.status,
        likelyCause,
        confidence: 0.80
      },
      eta: {
        currentMinutes: safeEta.currentMinutes,
        originalMinutes: safeEta.originalMinutes,
        delayMinutes: safeEta.delayMinutes
      },
      recommendation: {
        action,
        routeId: null,
        summary: `Deterministic action: ${action} (${reason})`
      },
      backup: {
        recommended: backupRecommended,
        reason: backupRecommended
          ? 'Delay exceeds critical threshold of 10 minutes; backup dispatch recommended.'
          : 'Delay is within operational bounds.',
        candidateVehicleId: null
      },
      observations: {
        observed: [
          `Route deviation status is ${deviation.status} (${deviation.distanceFromRouteMeters}m off route)`,
          `Traffic congestion level is ${traffic.level}`,
          `${incidents ? incidents.length : 0} active incidents nearby`
        ],
        inferred: [
          `Situation classified as ${likelyCause} by deterministic rule engine`
        ],
        unknown: [
          'AI generative explanation unavailable'
        ]
      },
      reasoning: `Vehicle ${vehicleId} is currently ${deviation.status} with an estimated delay of ${safeEta.delayMinutes} minutes. Recommended action: ${action}.`,
      analyzedAt: new Date().toISOString(),
      fallback: true
    };
  }

  /**
   * Parses JSON text from Gemini response, handling optional markdown formatting
   * @param {String} text
   * @returns {Object}
   */
  parseJSONResponse(text) {
    if (!text || typeof text !== 'string') {
      throw new Error('Empty or invalid response received from AI model');
    }

    let cleaned = text.trim();
    // Strip markdown code block fences if present
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    return JSON.parse(cleaned);
  }

  /**
   * Analyzes an emergency situation and generates an AI recommendation
   * @param {String} emergencyId
   * @returns {Promise<Object>}
   */
  async analyzeEmergency(emergencyId) {
    // 1. Resolve Emergency
    const emergency = await Emergency.findOne({ emergencyId, isDeleted: false })
      .populate('assignedVehicle', 'vehicleId registrationNumber status');

    if (!emergency) {
      const error = new Error('Emergency not found');
      error.status = 404;
      error.isOperational = true;
      throw error;
    }

    if (!emergency.assignedVehicle) {
      const error = new Error('No vehicle assigned to this emergency yet');
      error.status = 400;
      error.isOperational = true;
      throw error;
    }

    const vehicleId = emergency.assignedVehicle.vehicleId;

    // 2. Obtain deterministic Situation Analysis
    const situation = await analysisService.getVehicleSituation(vehicleId);

    // 3. Obtain quantitative prediction if available
    let prediction = null;
    try {
      prediction = await predictionService.predictForVehicle(vehicleId);
    } catch {
      // Non-fatal if prediction cannot be computed
    }

    // 4. Compute candidate route comparison & "What if we do nothing?"
    const activeRoute = await Route.findOne({
      vehicle: emergency.assignedVehicle._id,
      status: 'ACTIVE'
    }).sort({ createdAt: -1 });

    let comparison = {
      currentRoute: {
        etaMinutes: situation.eta.currentMinutes,
        distanceMeters: situation.progress ? situation.progress.remainingDistanceMeters : (activeRoute ? activeRoute.distance : 0),
        trafficLevel: situation.traffic ? situation.traffic.level : 'UNKNOWN',
        delayMinutes: situation.delay ? situation.delay.delayMinutes : 0
      },
      bestAlternative: null,
      whatIfDoNothing: {
        estimatedDelayMinutes: situation.delay ? situation.delay.delayMinutes : 0,
        riskLevel: situation.deviation.status !== 'ON_ROUTE' ? 'ELEVATED' : 'NOMINAL',
        summary: 'Maintaining current route may sustain delays if corridor congestion or deviation persists'
      },
      whyRouteChanged: []
    };

    if (activeRoute) {
      try {
        const routeResult = await routingService.getRouteWithAlternatives(activeRoute.origin, activeRoute.destination);
        const alternatives = routeResult.alternatives || [];
        if (alternatives.length > 0) {
          const bestAlt = alternatives[0];
          const bestAltEtaMinutes = Math.max(1, Math.round(bestAlt.durationSeconds / 60));
          const timeSavedMin = Math.max(0, situation.eta.currentMinutes - bestAltEtaMinutes);

          comparison.bestAlternative = {
            description: bestAlt.description,
            etaMinutes: bestAltEtaMinutes,
            distanceMeters: bestAlt.distanceMeters,
            trafficDelaySeconds: bestAlt.trafficDelaySeconds || 0,
            timeSavedMinutes: timeSavedMin,
            distanceDeltaMeters: bestAlt.distanceMeters - activeRoute.distance
          };

          if (timeSavedMin >= 2) {
            comparison.whyRouteChanged.push(`Alternative route provides an estimated time savings of ${timeSavedMin} minutes`);
          }
        }
      } catch (routeErr) {
        console.warn(`[GeoAgentService] Alternative route lookup warning: ${routeErr.message}`);
      }
    }

    if (situation.deviation.status !== 'ON_ROUTE') {
      comparison.whyRouteChanged.push(`Vehicle is ${Math.round(situation.deviation.distanceFromRouteMeters || 0)}m off planned route (${situation.deviation.status})`);
    }
    if (situation.traffic && (situation.traffic.level === 'HEAVY' || situation.traffic.level === 'SEVERE')) {
      comparison.whyRouteChanged.push(`Current corridor traffic is ${situation.traffic.level} with active slowdowns`);
    }
    if (prediction && prediction.delayRisk !== 'LOW') {
      comparison.whyRouteChanged.push(`Prediction model detected ${prediction.delayRisk} risk of arrival delay (+${prediction.predictedDelayMinutes} min)`);
    }

    // 5. Check for Gemini client
    const ai = this.getAIClient();
    if (!ai) {
      const fallback = this.generateFallbackResponse(situation, 'GEMINI_API_KEY environment variable not configured');
      fallback.comparison = comparison;
      fallback.prediction = prediction;
      fallback.whyRouteChanged = comparison.whyRouteChanged;
      return fallback;
    }

    // 6. Construct AI Prompts with Prompt Injection Defenses
    const untrustedDescription = emergency.description
      ? sanitizeText(emergency.description).slice(0, 300)
      : 'None';

    const situationContext = {
      emergency: {
        emergencyId: emergency.emergencyId,
        type: emergency.type,
        priority: emergency.priority,
        status: emergency.status,
        untrustedCallerDescription: untrustedDescription
      },
      vehicle: {
        vehicleId,
        status: emergency.assignedVehicle.status
      },
      deviation: situation.deviation,
      progress: situation.progress,
      traffic: situation.traffic,
      eta: situation.eta,
      delay: situation.delay,
      incidents: situation.incidents,
      evidence: situation.evidence,
      prediction: prediction ? {
        predictedDelayMinutes: prediction.predictedDelayMinutes,
        delayRisk: prediction.delayRisk,
        confidence: prediction.confidence,
        rerouteAdvised: prediction.rerouteAdvised
      } : null,
      comparison
    };

    const initialPrompt = `
Analyze the following active emergency situation and provide your structured decision-support recommendation.

SITUATION DATA:
${JSON.stringify(situationContext, null, 2)}

If you require alternative routes or backup vehicles to substantiate your recommendation, call the available tools.
Otherwise, output the final structured JSON object immediately.
`;

    try {
      const model = geoAgentConstants.model;
      let currentContents = initialPrompt;
      let round = 0;

      while (round < geoAgentConstants.maxToolCallRounds) {
        round++;

        const response = await ai.models.generateContent({
          model,
          contents: currentContents,
          config: {
            systemInstruction: GEOAGENT_SYSTEM_PROMPT,
            tools: [
              {
                functionDeclarations: geoAgentToolDeclarations
              }
            ]
          }
        });

        const functionCalls = response.functionCalls;

        // If no tool call was requested, we have our final text output
        if (!functionCalls || functionCalls.length === 0) {
          const rawJSON = this.parseJSONResponse(response.text);
          const validated = validateGeoAgentOutput(rawJSON, {
            vehicleId,
            emergencyId: emergency.emergencyId,
            routeStatus: situation.deviation.status,
            currentMinutes: situation.eta.currentMinutes,
            originalMinutes: situation.eta.originalMinutes
          });

          validated.comparison = comparison;
          validated.prediction = prediction;
          validated.whyRouteChanged = comparison.whyRouteChanged;

          // Emit Real-Time Event
          try {
            realtimeService.emitGeoAgentAnalysis(emergency.emergencyId, vehicleId, validated);
          } catch (err) {
            console.error(`[GeoAgentService] Real-time event emission error: ${err.message}`);
          }

          return validated;
        }


        // Handle tool calls
        const firstCall = functionCalls[0];
        const toolResult = await executeGeoAgentTool(firstCall.name, firstCall.args);

        // Feed tool response back into the conversation
        currentContents = [
          {
            role: 'user',
            parts: [{ text: initialPrompt }]
          },
          {
            role: 'model',
            parts: [
              {
                functionCall: {
                  name: firstCall.name,
                  args: firstCall.args
                }
              }
            ]
          },
          {
            role: 'user',
            parts: [
              {
                functionResponse: {
                  name: firstCall.name,
                  response: { result: toolResult }
                }
              }
            ]
          }
        ];
      }

      // If loop exceeded max rounds, return fallback based on deterministic situation
      const roundLimitFallback = this.generateFallbackResponse(situation, 'AI tool call round limit reached');
      roundLimitFallback.comparison = comparison;
      roundLimitFallback.prediction = prediction;
      roundLimitFallback.whyRouteChanged = comparison.whyRouteChanged;
      return roundLimitFallback;
    } catch (error) {
      console.error(`[GeoAgentService] Error during AI inference: ${error.message}`);
      const errorFallback = this.generateFallbackResponse(situation, `AI inference error: ${error.message}`);
      errorFallback.comparison = comparison;
      errorFallback.prediction = prediction;
      errorFallback.whyRouteChanged = comparison.whyRouteChanged;
      return errorFallback;
    }
  }

  /**
   * Analyzes an emergency vehicle by vehicleId
   * @param {String} vehicleId
   * @returns {Promise<Object>}
   */
  async analyzeVehicle(vehicleId) {
    const vehicle = await Vehicle.findOne({ vehicleId, isDeleted: false });
    if (!vehicle) {
      const error = new Error('Vehicle not found');
      error.status = 404;
      error.isOperational = true;
      throw error;
    }

    const activeEmergency = await Emergency.findOne({
      assignedVehicle: vehicle._id,
      isDeleted: false,
      status: { $in: ['DISPATCHED', 'IN_PROGRESS', 'AT_SCENE'] }
    });

    if (activeEmergency) {
      return await this.analyzeEmergency(activeEmergency.emergencyId);
    }

    // If no active emergency, analyze vehicle situation directly with fallback
    const situation = await analysisService.getVehicleSituation(vehicleId);
    return this.generateFallbackResponse(situation, 'Vehicle has no active assigned emergency');
  }
}

export default new GeoAgentService();