import { geoAgentConstants } from './geoagent.constants.js';

/**
 * GeoAgent agentic core: bounded multi-step tool loop, AgentState, route comparison
 * and advisory policy. Pure of DB/network — the AI client and tool executor are injected.
 */

const { actions, observationTypes } = geoAgentConstants;

// Tool name -> AgentState slot
const TOOL_SLOTS = Object.freeze({
  getEmergencyState: 'emergency',
  getVehicleState: 'vehicle',
  getRecentTrajectory: 'trajectory',
  getCurrentRoute: 'currentRoute',
  getRouteAlternatives: 'alternativeRoutes',
  getAlternativeRoutes: 'alternativeRoutes',
  getTrafficAnalysis: 'traffic',
  getPrediction: 'prediction',
  getNearbyIncidents: 'incidents',
  getDecisionHistory: 'decisionHistory'
});

const STATE_SLOTS = [
  'emergency', 'vehicle', 'trajectory', 'currentRoute', 'alternativeRoutes',
  'traffic', 'incidents', 'prediction', 'decisionHistory'
];

/**
 * What the agent currently knows. `known` holds tool/service data (OBSERVED or DERIVED),
 * `missing` lists slots that were never retrieved or whose tool failed (UNKNOWN).
 * The model's interpretation lives only in `recommendation` (AI ADVISORY).
 */
export const createAgentState = (seed = {}) => {
  const state = { known: {}, failed: {}, toolTrace: [], recommendation: null };
  for (const [slot, value] of Object.entries(seed)) {
    if (value !== undefined && value !== null) state.known[slot] = value;
  }
  return state;
};

export const missingSlots = (state) => STATE_SLOTS.filter((s) => !(s in state.known));

const isToolError = (r) => !r || typeof r !== 'object' || typeof r.error === 'string';

const recordToolResult = (state, name, result) => {
  const slot = TOOL_SLOTS[name];
  if (!slot) return;
  if (isToolError(result) || result.found === false) {
    state.failed[slot] = isToolError(result) ? (result && result.error) || 'INVALID_TOOL_RESPONSE' : 'NOT_FOUND';
    return;
  }
  state.known[slot] = result;
  delete state.failed[slot];
};

const stableKey = (name, args) => {
  const a = args && typeof args === 'object' ? args : {};
  return `${name}:${JSON.stringify(Object.keys(a).sort().map((k) => [k, a[k]]))}`;
};

const withTimeout = (promise, ms) => {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error('Tool timed out'), { code: 'TOOL_TIMEOUT', isOperational: true })), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

/**
 * Runs one tool call safely. Never throws and never invents data: failures become
 * { error, message } so the model (and AgentState) see them as UNKNOWN.
 */
const runTool = async (call, { executeTool, scope, state, seen, budget, runId, limits }) => {
  const name = typeof call.name === 'string' ? call.name : '';
  const key = stableKey(name, call.args);
  const started = Date.now();
  let result;

  if (seen.has(key)) {
    result = { error: 'DUPLICATE_CALL', message: 'Already retrieved with identical arguments; reuse the earlier result.' };
  } else if (budget.used >= limits.maxTotalToolCalls) {
    result = { error: 'TOOL_BUDGET_EXHAUSTED', message: 'Tool call budget exhausted; produce the final answer.' };
  } else {
    seen.add(key);
    budget.used += 1;
    try {
      result = await withTimeout(Promise.resolve(executeTool(name, call.args, scope)), limits.toolTimeoutMs);
      if (!result || typeof result !== 'object') {
        result = { error: 'INVALID_TOOL_RESPONSE', message: 'Tool returned no usable data.' };
      }
    } catch (err) {
      result = {
        error: err.code || 'TOOL_EXECUTION_FAILED',
        message: err.isOperational || err.code ? err.message : 'Tool execution failed'
      };
    }
  }

  recordToolResult(state, name, result);
  const ok = !isToolError(result);
  state.toolTrace.push({ tool: name, ok, ms: Date.now() - started, ...(ok ? {} : { error: result.error }) });
  console.info(`[GeoAgent] run=${runId} tool=${name} ${ok ? 'ok' : `failed(${result.error})`} ${Date.now() - started}ms`);
  return result;
};

/**
 * Bounded LLM tool loop (OpenAI chat format via the provider adapter). Full conversation history is kept
 * across rounds; all tool calls in a round are executed (capped); the last round offers no tools so the model
 * must answer. Returns the final response text (caller parses/validates).
 */
export const runAgentLoop = async ({
  ai, model, systemInstruction, toolDeclarations, initialPrompt, executeTool, scope, state, runId = 'run', limits = {}
}) => {
  const cfg = {
    maxToolCallRounds: geoAgentConstants.maxToolCallRounds,
    maxCallsPerRound: geoAgentConstants.maxToolCallsPerRound,
    maxTotalToolCalls: geoAgentConstants.maxTotalToolCalls,
    toolTimeoutMs: geoAgentConstants.toolTimeoutMs,
    ...limits
  };
  const messages = [
    { role: 'system', content: systemInstruction },
    { role: 'user', content: initialPrompt }
  ];
  const seen = new Set();
  const budget = { used: 0 };

  for (let round = 1; round <= cfg.maxToolCallRounds; round++) {
    const lastRound = round === cfg.maxToolCallRounds;
    const response = await ai.chat({ model, messages, tools: lastRound ? undefined : toolDeclarations });

    const calls = lastRound ? [] : (response.toolCalls || []);
    if (calls.length === 0) return response.text;

    // Only the executed calls are echoed back, so every tool_call gets a tool reply.
    const batch = calls.slice(0, cfg.maxCallsPerRound);
    messages.push({
      role: 'assistant',
      content: response.text || null,
      tool_calls: batch.map((c) => ({ id: c.id, type: 'function', function: { name: c.name, arguments: JSON.stringify(c.args || {}) } }))
    });

    for (const call of batch) {
      const result = await runTool(call, { executeTool, scope, state, seen, budget, runId, limits: cfg });
      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }
  return null;
};

/**
 * Deterministic route comparison over getRouteAlternatives output (candidate 0 = primary).
 * Consumes Person 1/2 route data only; no routing logic.
 */
export const compareRoutes = (alternativeRoutes) => {
  const candidates = alternativeRoutes && Array.isArray(alternativeRoutes.candidateRoutes)
    ? alternativeRoutes.candidateRoutes.filter((c) => c && Number.isFinite(c.etaMinutes))
    : [];
  if (candidates.length < 2) {
    return { status: observationTypes.UNKNOWN, best: null, timeSavedMinutes: null, materiallyBetter: false };
  }
  const [primary, ...alts] = candidates;
  const best = alts.reduce((a, b) => (b.etaMinutes < a.etaMinutes ? b : a));
  const timeSavedMinutes = primary.etaMinutes - best.etaMinutes;
  return {
    status: 'COMPARED',
    primary: { name: primary.name, etaMinutes: primary.etaMinutes, traffic: primary.traffic },
    best: { name: best.name, etaMinutes: best.etaMinutes, traffic: best.traffic, distanceMeters: best.distanceMeters },
    timeSavedMinutes,
    materiallyBetter: timeSavedMinutes >= geoAgentConstants.materialTimeSavingMinutes,
    metricsType: observationTypes.DERIVED
  };
};

/**
 * Advisory guardrails applied to the validated model output. The model only recommends:
 * REROUTE needs a materially better compared alternative, low confidence forces operator
 * review, and unknowns/evidence are attached rather than silently dropped.
 */
export const applyAdvisoryPolicy = (output, state, comparison) => {
  const uncertainty = [...(output.observations?.unknown || [])];
  const evidence = [...(output.observations?.observed || [])];
  const rec = output.recommendation;
  let downgraded = false;

  for (const slot of missingSlots(state)) uncertainty.push(`${slot}: UNKNOWN (not retrieved or unavailable)`);
  for (const [slot, why] of Object.entries(state.failed)) uncertainty.push(`${slot}: tool failed (${why})`);

  if (rec.action === actions.REROUTE) {
    if (comparison.materiallyBetter) {
      rec.routeId = comparison.best.name;
      evidence.push(`Alternative "${comparison.best.name}" is ${comparison.timeSavedMinutes} min faster than the current route`);
    } else {
      downgraded = true;
      rec.action = actions.MONITOR;
      rec.routeId = null;
      rec.summary = 'Reroute not supported: no materially better alternative verified; continue monitoring';
      uncertainty.push('No materially better alternative route could be verified');
    }
  } else {
    rec.routeId = null;
  }

  const requiresOperatorReview = downgraded || output.assessment.confidence < geoAgentConstants.minConfidence;

  return {
    ...output,
    comparison,
    evidence,
    uncertainty,
    requiresOperatorReview: Boolean(requiresOperatorReview),
    advisoryOnly: true
  };
};
