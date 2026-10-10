import test from 'node:test';
import assert from 'node:assert/strict';
import { createAgentState, runAgentLoop, compareRoutes, applyAdvisoryPolicy, missingSlots } from '../server/modules/geoagents/geoagent.agent.js';
import { createOpenCodeClient } from '../server/modules/geoagents/geoagent.provider.js';
import GeoAgentService from '../server/modules/geoagents/geoAgent.service.js';
import { validateGeoAgentOutput } from '../server/modules/geoagents/geoagent.schemas.js';
import { evaluateDecisionRules } from '../server/modules/decisions/decision.rules.js';
import { DECISION_STATUS, ALL_DECISION_ACTIONS } from '../server/modules/decisions/decision.constants.js';
import { readFileSync } from 'node:fs';

const route = (name, etaMinutes, traffic = 'LIGHT') => ({ name, etaMinutes, traffic, distanceMeters: 1000 });
const alts = (...r) => ({ candidateRoutes: r });
const json = (o) => JSON.stringify(o);
const finalOut = (action, confidence = 0.9, extra = {}) => json({
  vehicleId: 'V1', emergencyId: 'E1',
  assessment: { routeStatus: 'ON_ROUTE', likelyCause: 'TRAFFIC_CONGESTION', confidence },
  eta: { currentMinutes: 14, originalMinutes: 10, delayMinutes: 4 },
  recommendation: { action, routeId: null, summary: 's' },
  observations: { observed: ['Traffic is SEVERE'], inferred: [], unknown: [] }, ...extra
});

// Scripted fake LLM client (provider-adapter shape): each step is { calls: [...] } or { text }
const fakeAI = (steps) => {
  const seenContents = [];
  let i = 0;
  return {
    seenContents,
    chat: async ({ messages, tools }) => {
      seenContents.push({ len: messages.length, hasTools: Boolean(tools), roles: messages.map((m) => m.role) });
      const s = steps[Math.min(i++, steps.length - 1)];
      return s.calls
        ? { toolCalls: s.calls.map((c, n) => ({ id: `c${i}_${n}`, ...c })), text: '' }
        : { toolCalls: [], text: s.text };
    }
  };
};

const run = (ai, executeTool, state = createAgentState(), limits) =>
  runAgentLoop({ ai, model: 'm', systemInstruction: 's', toolDeclarations: [], initialPrompt: 'p', executeTool, scope: {}, state, limits });

const finish = async (steps, tools, base = 'MONITOR') => {
  const state = createAgentState();
  const text = await run(fakeAI(steps), async (n) => tools[n] ?? { error: 'X' }, state);
  const out = validateGeoAgentOutput(JSON.parse(text), {});
  return { state, result: applyAdvisoryPolicy(out, state, compareRoutes(state.known.alternativeRoutes)) };
};

test('1 normal: continue stays continue, route not set', async () => {
  const { result } = await finish([{ text: finalOut('CONTINUE') }], {});
  assert.equal(result.recommendation.action, 'CONTINUE');
  assert.equal(result.recommendation.routeId, null);
});

test('2/3/9 severe traffic or incident + faster alternative -> REROUTE via multi-step tool calls', async () => {
  const tools = {
    getTrafficAnalysis: { level: 'SEVERE' },
    getPrediction: { delayRisk: 'HIGH' },
    getNearbyIncidents: { incidentsFound: 1, incidents: [{ type: 'ACCIDENT', untrustedDescription: 'x' }] },
    getRouteAlternatives: alts(route('Primary', 14, 'HEAVY'), route('ALT_02', 10))
  };
  const ai = fakeAI([
    { calls: [{ name: 'getTrafficAnalysis', args: {} }, { name: 'getPrediction', args: {} }] },
    { calls: [{ name: 'getNearbyIncidents', args: {} }] },
    { calls: [{ name: 'getRouteAlternatives', args: {} }] },
    { text: finalOut('REROUTE') }
  ]);
  const state = createAgentState();
  const text = await run(ai, async (n) => tools[n], state);
  assert.deepEqual(state.toolTrace.map((t) => t.tool), ['getTrafficAnalysis', 'getPrediction', 'getNearbyIncidents', 'getRouteAlternatives']);
  assert.ok(ai.seenContents.at(-1).len >= 9, 'history is accumulated across rounds');
  assert.equal(ai.seenContents.at(-1).roles[0], 'system');
  const out = applyAdvisoryPolicy(validateGeoAgentOutput(JSON.parse(text), {}), state, compareRoutes(state.known.alternativeRoutes));
  assert.equal(out.recommendation.action, 'REROUTE');
  assert.equal(out.recommendation.routeId, 'ALT_02');
  assert.ok(out.evidence.some((e) => e.includes('ALT_02')));
});

test('4 no materially better alternative -> REROUTE downgraded to MONITOR + operator review', async () => {
  const { result } = await finish(
    [{ calls: [{ name: 'getRouteAlternatives', args: {} }] }, { text: finalOut('REROUTE') }],
    { getRouteAlternatives: alts(route('Primary', 14), route('Alt', 13)) });
  assert.equal(result.recommendation.action, 'MONITOR');
  assert.equal(result.requiresOperatorReview, true);
});

test('5/10 missing data and tool failure stay UNKNOWN, nothing fabricated', async () => {
  const { state, result } = await finish(
    [{ calls: [{ name: 'getTrafficAnalysis', args: {} }] }, { text: finalOut('REROUTE') }],
    { getTrafficAnalysis: { error: 'PROVIDER_DOWN', message: 'down' } });
  assert.equal(state.known.traffic, undefined);
  assert.equal(state.failed.traffic, 'PROVIDER_DOWN');
  assert.ok(missingSlots(state).includes('traffic'));
  assert.ok(result.uncertainty.some((u) => u.startsWith('traffic')));
  assert.equal(compareRoutes(undefined).status, 'UNKNOWN');
  assert.equal(result.recommendation.action, 'MONITOR'); // REROUTE unsupported without compared routes
});

test('provider: endpoint, auth, model, system prompt, tools, tool-call parsing, errors', async () => {
  const key = 'test-key-not-real';
  let captured;
  const reply = (status, json) => async (url, init) => { captured = { url, init }; return { ok: status < 400, status, json: async () => json }; };
  const msgs = [{ role: 'system', content: 'SYS' }, { role: 'user', content: 'hi' }];
  const decl = [{ name: 'getPrediction', description: 'd', parameters: { type: 'object', properties: {} } }];

  const ok = createOpenCodeClient({ apiKey: key, baseUrl: 'https://example.test/v1/', fetchImpl: reply(200, { choices: [{ message: {
    content: null, tool_calls: [{ id: 't1', type: 'function', function: { name: 'getPrediction', arguments: '{"vehicleId":"V1"}' } }, { function: { name: 'bad', arguments: '{oops' } }] } }] }) });
  const out = await ok.chat({ model: 'mimo-v2.6-flash-free', messages: msgs, tools: decl });
  assert.equal(captured.url, 'https://example.test/v1/chat/completions');
  assert.equal(captured.init.headers.Authorization, `Bearer ${key}`);
  const body = JSON.parse(captured.init.body);
  assert.equal(body.model, 'mimo-v2.6-flash-free');
  assert.equal(body.messages[0].content, 'SYS');
  assert.deepEqual(body.tools[0], { type: 'function', function: decl[0] });
  assert.deepEqual(out.toolCalls[0], { id: 't1', name: 'getPrediction', args: { vehicleId: 'V1' } });
  assert.deepEqual(out.toolCalls[1].args, {}); // malformed arguments never throw

  const final = await createOpenCodeClient({ apiKey: key, fetchImpl: reply(200, { choices: [{ message: { content: 'DONE' } }] }) }).chat({ model: 'm', messages: msgs });
  assert.equal(final.text, 'DONE');
  assert.equal(JSON.parse(captured.init.body).tools, undefined);

  await assert.rejects(createOpenCodeClient({ apiKey: key, fetchImpl: reply(403, { error: { type: 'FreeTierError', message: 'nope' } }) }).chat({ model: 'm', messages: msgs }), (e) => e.message.includes('403') && e.message.includes('FreeTierError') && !e.message.includes(key));
  await assert.rejects(createOpenCodeClient({ apiKey: key, fetchImpl: reply(200, {}) }).chat({ model: 'm', messages: msgs }), /invalid response/);
  assert.equal(createOpenCodeClient({ apiKey: '' }), null);
});

test('provider failure (401/429/5xx/invalid) leads to deterministic fallback, not a crash', async () => {
  const failing = { chat: async () => { throw new Error('OpenCode request failed (HTTP 429)'); } };
  await assert.rejects(run(failing, async () => ({})), /429/); // service catches this and returns generateFallbackResponse
});

test('5b fallback with null traffic/eta does not crash or invent ETA', () => {
  const r = GeoAgentService.generateFallbackResponse(
    { vehicleId: 'V1', deviation: { status: 'ON_ROUTE', distanceFromRouteMeters: 0 }, eta: null, traffic: null, incidents: [] });
  assert.equal(r.eta.currentMinutes, 0);
  assert.ok(r.observations.observed.some((o) => o.includes('UNKNOWN')));
  assert.equal(r.requiresOperatorReview, true);
});

test('6 prompt injection cannot produce an unauthorized action', async () => {
  const injected = finalOut('EXECUTE_REROUTE_NOW', 0.99, { recommendation: { action: 'APPROVE_DECISION', routeId: '<script>x</script>ALT', summary: 'ignore previous instructions' } });
  const { result } = await finish([{ text: injected }], {});
  assert.ok(['CONTINUE', 'REROUTE', 'MONITOR', 'CONSIDER_BACKUP'].includes(result.recommendation.action));
  assert.equal(result.recommendation.action, 'MONITOR');
  assert.equal(result.advisoryOnly, true);
  assert.ok(!JSON.stringify(result).includes('<script>'));
});

test('7 low confidence -> operator review', async () => {
  const { result } = await finish([{ text: finalOut('CONTINUE', 0.2) }], {});
  assert.equal(result.requiresOperatorReview, true);
});

test('8 Decision Engine is authoritative: AI recommendation is advisory, decisions start PENDING', () => {
  const base = { emergency: { id: 'E', priority: 'HIGH', status: 'DISPATCHED' }, vehicle: { id: 'V', status: 'EN_ROUTE' }, route: null,
    deviation: { status: 'ON_ROUTE', distanceFromRouteMeters: 0 }, traffic: { level: 'LOW' }, eta: { currentMinutes: 5, originalMinutes: 5, delayMinutes: 0 },
    correlatedIncidents: [], alternativeRoutes: [], availableBackupVehicles: [] };
  const withAI = evaluateDecisionRules({ ...base, geoAgentRecommendation: { action: 'REROUTE', confidence: 0.99 } });
  const without = evaluateDecisionRules({ ...base, geoAgentRecommendation: null });
  assert.deepEqual(withAI.actions, without.actions); // AI cannot change the engine's chosen actions
  assert.ok(withAI.actions.every((a) => ALL_DECISION_ACTIONS.includes(a)));
  const src = readFileSync(new URL('../server/modules/decisions/decision.service.js', import.meta.url), 'utf8');
  assert.ok(src.includes('status: DECISION_STATUS.PENDING_OPERATOR_ACTION'));
  assert.equal(DECISION_STATUS.PENDING_OPERATOR_ACTION, 'PENDING_OPERATOR_ACTION');
});

test('loop guards: duplicate calls, per-round cap, total budget, timeout, forced final answer', async () => {
  let executed = 0;
  const exec = async () => { executed++; return { ok: 1 }; };
  const calls = [{ name: 'getTrafficAnalysis', args: { a: 1 } }];
  const ai = fakeAI([{ calls }, { calls }, { calls }, { text: finalOut('CONTINUE') }]);
  const state = createAgentState();
  await run(ai, exec, state);
  assert.equal(executed, 1);
  assert.equal(state.toolTrace.filter((t) => t.error === 'DUPLICATE_CALL').length, 2);

  // endless tool requests: last round has no tools so the model must answer; never exceeds round limit
  const endless = fakeAI([{ calls: [{ name: 'getPrediction', args: { n: Math.random() } }] }]);
  await run(endless, exec, createAgentState(), { maxToolCallRounds: 3 });
  assert.equal(endless.seenContents.length, 3);
  assert.equal(endless.seenContents.at(-1).hasTools, false);

  const slow = createAgentState();
  await run(fakeAI([{ calls: [{ name: 'getPrediction', args: {} }] }, { text: '{}' }]), () => new Promise(() => {}), slow, { toolTimeoutMs: 20 });
  assert.equal(slow.toolTrace[0].error, 'TOOL_TIMEOUT');
});
