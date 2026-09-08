/**
 * Candidate Route Comparison & What-If Analysis Service
 *
 * Provides deterministic, evidence-based route comparison between:
 * - CURRENT ROUTE
 * - ALTERNATIVE CANDIDATE 1
 * - ALTERNATIVE CANDIDATE 2
 *
 * Calculates:
 * - Distance differences (meters)
 * - ETA differences (minutes)
 * - Traffic delay differences (seconds/minutes)
 * - Time saved / improvement metrics
 * - "What happens if we do nothing?" deterministic scenario projection
 * - "Why did the route change?" causal evidence tags
 *
 * CRITICAL RULE:
 * All metrics are calculated deterministically.
 * Gemini does NOT invent or compute these numbers.
 */

class RouteComparisonService {
  /**
   * Compares the active route with candidate alternative routes deterministically
   * @param {Object} params
   * @param {Object} params.currentRoute Active planned/monitored route
   * @param {Array<Object>} params.candidateRoutes Alternative routes from routing provider
   * @param {Object} [params.currentVehicleState] Vehicle location, speed, heading
   * @param {Object} [params.predictionState] Prediction result from PredictionService
   * @param {Object} [params.deviationState] Deviation analysis result
   * @param {Array<Object>} [params.incidents] Correlated road hazards
   * @returns {Object} Structured comparison matrix and what-if analysis
   */
  compareRoutes({
    currentRoute,
    candidateRoutes = [],
    currentVehicleState = null,
    predictionState = null,
    deviationState = null,
    incidents = [],
    v2xCorridor = null
  }) {
    const evaluatedAt = new Date().toISOString();

    // 1. Normalize current route metrics
    const currentDistanceMeters = currentRoute && typeof currentRoute.distanceMeters === 'number'
      ? currentRoute.distanceMeters
      : (currentRoute && typeof currentRoute.distance === 'number' ? currentRoute.distance : 0);

    const currentDurationSeconds = currentRoute && typeof currentRoute.durationSeconds === 'number'
      ? currentRoute.durationSeconds
      : (currentRoute && typeof currentRoute.duration === 'number' ? currentRoute.duration : 0);

    const currentTrafficDelaySeconds = currentRoute && typeof currentRoute.trafficDelaySeconds === 'number'
      ? currentRoute.trafficDelaySeconds
      : 0;

    const currentEtaMinutes = predictionState && typeof predictionState.predictedDurationMinutes === 'number'
      ? Math.round(predictionState.predictedDurationMinutes)
      : Math.max(1, Math.round(currentDurationSeconds / 60));

    const currentDelayMinutes = predictionState && typeof predictionState.predictedDelayMinutes === 'number'
      ? predictionState.predictedDelayMinutes
      : Math.round(currentTrafficDelaySeconds / 60);

    const currentSummary = {
      name: currentRoute?.description || 'Current Active Route',
      provider: currentRoute?.provider || 'SYSTEM',
      distanceMeters: currentDistanceMeters,
      durationSeconds: currentDurationSeconds,
      etaMinutes: currentEtaMinutes,
      trafficDelaySeconds: currentTrafficDelaySeconds,
      trafficDelayMinutes: Number((currentTrafficDelaySeconds / 60).toFixed(1)),
      trafficLevel: currentTrafficDelaySeconds > 180 ? 'HEAVY' : (currentTrafficDelaySeconds > 60 ? 'MODERATE' : 'NORMAL'),
      status: 'CURRENT'
    };

    // 2. Evaluate candidate alternatives
    const normalizedAlternatives = [];
    let bestAlternative = null;
    let maxTimeSaved = 0;

    const safeAlternatives = Array.isArray(candidateRoutes) ? candidateRoutes : [];

    safeAlternatives.forEach((alt, idx) => {
      const candidateIndex = idx + 1;
      const altDistanceMeters = typeof alt.distanceMeters === 'number' ? alt.distanceMeters : 0;
      const altDurationSeconds = typeof alt.durationSeconds === 'number' ? alt.durationSeconds : 0;
      const altTrafficDelaySeconds = typeof alt.trafficDelaySeconds === 'number' ? alt.trafficDelaySeconds : 0;
      const altEtaMinutes = Math.max(1, Math.round(altDurationSeconds / 60));

      const etaDifferenceMinutes = currentEtaMinutes - altEtaMinutes;
      const timeSavedMinutes = Math.max(0, etaDifferenceMinutes);
      const distanceDeltaMeters = altDistanceMeters - currentDistanceMeters;
      const trafficDelayDeltaSeconds = altTrafficDelaySeconds - currentTrafficDelaySeconds;

      const altSummary = {
        candidateIndex,
        name: alt.description || `Alternative Route ${candidateIndex}`,
        provider: alt.provider || 'GOOGLE',
        distanceMeters: altDistanceMeters,
        durationSeconds: altDurationSeconds,
        etaMinutes: altEtaMinutes,
        trafficDelaySeconds: altTrafficDelaySeconds,
        trafficDelayMinutes: Number((altTrafficDelaySeconds / 60).toFixed(1)),
        timeSavedMinutes,
        etaDifferenceMinutes,
        distanceDeltaMeters,
        trafficDelayDeltaSeconds,
        trafficLevel: altTrafficDelaySeconds > 180 ? 'HEAVY' : (altTrafficDelaySeconds > 60 ? 'MODERATE' : 'LIGHT'),
        isFaster: etaDifferenceMinutes > 0,
        isRecommended: false
      };

      if (timeSavedMinutes > maxTimeSaved) {
        maxTimeSaved = timeSavedMinutes;
        bestAlternative = altSummary;
      }

      normalizedAlternatives.push(altSummary);
    });

    // Mark recommendation on best alternative if time saved >= 2 min or active route is critically impaired
    const isCriticalDeviation = deviationState && (deviationState.status === 'CRITICAL_DEVIATION' || deviationState.status === 'DEVIATED');
    const hasCorridorBlock = Array.isArray(incidents) && incidents.some((i) => i.type === 'ROAD_CLOSURE' || i.type === 'ROADBLOCK');

    if (bestAlternative && (bestAlternative.timeSavedMinutes >= 2 || isCriticalDeviation || hasCorridorBlock)) {
      bestAlternative.isRecommended = true;
    }

    // 3. Deterministic "What if we do nothing?" scenario projection
    let operationalRisk = 'NOMINAL';
    if (hasCorridorBlock || (deviationState && deviationState.status === 'CRITICAL_DEVIATION')) {
      operationalRisk = 'CRITICAL';
    } else if (isCriticalDeviation || currentDelayMinutes >= 5) {
      operationalRisk = 'HIGH';
    } else if (currentDelayMinutes >= 2 || (predictionState && predictionState.delayRisk === 'MEDIUM')) {
      operationalRisk = 'ELEVATED';
    }

    const whatIfReasons = [];
    if (currentDelayMinutes > 0) {
      whatIfReasons.push(`Active corridor delay has accumulated +${currentDelayMinutes} minutes relative to baseline schedule`);
    }
    if (deviationState && deviationState.status !== 'ON_ROUTE') {
      whatIfReasons.push(`Vehicle is ${Math.round(deviationState.distanceFromRouteMeters || 0)}m off expected centerline (${deviationState.status})`);
    }
    if (hasCorridorBlock) {
      whatIfReasons.push('Corridor is obstructed by reported road closure or physical barricade');
    }
    if (bestAlternative && bestAlternative.timeSavedMinutes > 0) {
      whatIfReasons.push(`Forfeiting alternative corridor forfeits ${bestAlternative.timeSavedMinutes} minutes in transit savings`);
    }
    if (v2xCorridor && v2xCorridor.corridorSummary) {
      if (v2xCorridor.corridorSummary.corridorHealth === 'CORRIDOR_BLOCKED') {
        whatIfReasons.push('Corridor is physically blocked; V2X green-wave preemption cannot clear path');
      } else if (v2xCorridor.corridorSummary.preemptedCount > 0) {
        whatIfReasons.push(`V2X Green Wave preemption active on ${v2xCorridor.corridorSummary.preemptedCount} signal(s) saving ~${v2xCorridor.corridorSummary.timeSavedMinutes} min`);
      }
    }
    if (whatIfReasons.length === 0) {
      whatIfReasons.push('Corridor is operating within nominal emergency transit parameters');
    }

    const whatIfDoNothing = {
      scenario: 'MAINTAIN_CURRENT_CORRIDOR',
      projectedDelayMinutes: currentDelayMinutes,
      estimatedDelayMinutes: currentDelayMinutes,
      operationalRisk,
      etaDeltaVsBestMinutes: bestAlternative ? bestAlternative.timeSavedMinutes : 0,
      summary: operationalRisk === 'CRITICAL' || operationalRisk === 'HIGH'
        ? `Maintaining the current corridor without intervention projects significant delays (+${currentDelayMinutes} min) and elevated response risk.`
        : `Maintaining current corridor is acceptable under nominal conditions (+${currentDelayMinutes} min variance).`,
      reasons: whatIfReasons
    };

    // 4. Deterministic "Why did the route change?" evidence tags
    const whyRouteChanged = [];
    if (bestAlternative && bestAlternative.timeSavedMinutes >= 2) {
      whyRouteChanged.push(`Alternative corridor provides ${bestAlternative.timeSavedMinutes} min faster arrival via bypass`);
    }
    if (deviationState && deviationState.status === 'CRITICAL_DEVIATION') {
      whyRouteChanged.push(`Critical vehicle deviation detected (${Math.round(deviationState.distanceFromRouteMeters || 0)}m off route)`);
    } else if (deviationState && deviationState.status === 'DEVIATED') {
      whyRouteChanged.push(`Vehicle deviated from planned path (${Math.round(deviationState.distanceFromRouteMeters || 0)}m)`);
    }
    if (currentTrafficDelaySeconds > 120) {
      whyRouteChanged.push(`Traffic congestion on current route introduces +${Math.round(currentTrafficDelaySeconds / 60)} min delay`);
    }
    if (hasCorridorBlock) {
      whyRouteChanged.push('Emergency route intersects an active road closure');
    }
    if (predictionState && (predictionState.delayRisk === 'HIGH' || predictionState.delayRisk === 'CRITICAL')) {
      whyRouteChanged.push(`Quantitative prediction model flagged ${predictionState.delayRisk} arrival delay risk`);
    }

    return {
      current: currentSummary,
      currentRoute: currentSummary,
      alternatives: normalizedAlternatives,
      bestAlternative,
      whatIfDoNothing,
      whyRouteChanged,
      v2xCorridor: v2xCorridor?.corridorSummary || null,
      evaluatedAt
    };
  }
}

export default new RouteComparisonService();
