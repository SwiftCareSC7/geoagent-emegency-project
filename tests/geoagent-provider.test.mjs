import test from 'node:test';
import assert from 'node:assert/strict';
import { createLlmProvider, selectFreeModels, PROVIDERS } from '../server/modules/geoagents/geoagent.provider.js';
import { createAgentState, runAgentLoop } from '../server/modules/geoagents/geoagent.agent.js';

// Mocked catalogs/endpoints only — no real keys or network.
const OC_KEY = 'oc-test-key-not-real';
const OR_KEY = 'or-test-key-not-real';
const zero = { prompt: '0', completion: '0' };
const OC_CATALOG = [{ id: 'alpha-free' }, { id: 'paid-pro' }, { id: 'beta-free' }];
const OR_CATALOG = [
  { id: 'or/free-tools:free', pricing: zero, supported_parameters: ['tools'], context_length: 131072 },
  { id: 'or/free-notools:free', pricing: zero, supported_parameters: ['temperature'], context_length: 131072 },
  { id: 'or/paid', pricing: { prompt: '0.000001', completion: '0' }, supported_parameters: ['tools'], context_length: 131072 },
  { id: 'or/tiny:free', pricing: zero, supported_parameters: ['tools'], context_length: 4096 },
  { id: 'or/free-two:free', pricing: zero, supported_parameters: ['tools'], context_length: 65536 }
];
const msgs = [{ role: 'system', content: 'SYS' }, { role: 'user', content: 'hi' }];
const decl = [{ name: 'getPrediction', description: 'd', parameters: { type: 'object', properties: {} } }];
const toolReply = { choices: [{ message: { content: null, tool_calls: [{ id: 't1', function: { name: 'getPrediction', arguments: '{}' } }] } }] };
const textReply = (t) => ({ choices: [{ message: { content: t } }] });

/** respond(provider, model, body) -> { status, json } | throws; records every chat call */
const harness = (respond, { env = {}, catalogs = {} } = {}) => {
  const calls = [];
  const logs = [];
  const fetchImpl = async (url, init) => {
    const provider = url.includes('openrouter') ? 'openrouter' : 'opencode';
    if (url.endsWith('/models')) {
      const data = catalogs[provider] ?? (provider === 'opencode' ? OC_CATALOG : OR_CATALOG);
      if (data instanceof Error) throw data;
      return { ok: true, status: 200, json: async () => ({ data }) };
    }
    const body = JSON.parse(init.body);
    calls.push({ provider, model: body.model, body, auth: init.headers.Authorization });
    const r = await respond(provider, body.model, body);
    return { ok: r.status < 400, status: r.status, json: async () => r.json };
  };
  const log = { info: (m) => logs.push(m), warn: (m) => logs.push(m) };
  const ai = createLlmProvider({ env: { OPENCODE_API_KEY: OC_KEY, OPENROUTER_API_KEY: OR_KEY, AI_PROVIDER: 'auto', ...env }, fetchImpl, log });
  return { ai, calls, logs };
};
const ok = (json) => ({ status: 200, json });
const err = (status) => ({ status, json: { error: { type: 'E', message: `failed ${status}` } } });
const noSecrets = (logs, calls) => {
  const text = logs.join('\n');
  assert.ok(!text.includes(OC_KEY) && !text.includes(OR_KEY), 'keys must never be logged');
  for (const c of calls) assert.ok(!JSON.stringify(c.body).includes(OC_KEY) && !JSON.stringify(c.body).includes(OR_KEY));
};

test('free-model selection: only catalog-confirmed free + tool-capable models', () => {
  assert.deepEqual(selectFreeModels(PROVIDERS.openrouter, OR_CATALOG), ['or/free-tools:free', 'or/free-two:free']);
  assert.deepEqual(selectFreeModels(PROVIDERS.openrouter, OR_CATALOG, 'or/free-two:free'), ['or/free-two:free', 'or/free-tools:free']);
  assert.deepEqual(selectFreeModels(PROVIDERS.openrouter, OR_CATALOG, 'or/paid'), ['or/free-tools:free', 'or/free-two:free']); // paid preference ignored
  assert.deepEqual(selectFreeModels(PROVIDERS.opencode, OC_CATALOG), ['alpha-free', 'beta-free']);
  assert.deepEqual(selectFreeModels(PROVIDERS.openrouter, [{ id: 'x', supported_parameters: ['tools'] }]), []); // no pricing = not confirmed free
});

test('no configured key -> null (service uses deterministic fallback)', () => {
  assert.equal(createLlmProvider({ env: {} }), null);
  assert.equal(createLlmProvider({ env: { AI_PROVIDER: 'openrouter', OPENCODE_API_KEY: 'k' } }), null);
});

test('AI_PROVIDER=opencode: OpenCode free model success with tool call', async () => {
  const { ai, calls, logs } = harness(() => ok(toolReply), { env: { AI_PROVIDER: 'opencode' } });
  const out = await ai.chat({ messages: msgs, tools: decl });
  assert.equal(out.toolCalls[0].name, 'getPrediction');
  assert.deepEqual(calls.map((c) => [c.provider, c.model]), [['opencode', 'alpha-free']]);
  assert.equal(calls[0].auth, `Bearer ${OC_KEY}`);
  assert.deepEqual(ai.lastUsed(), { provider: 'opencode', model: 'alpha-free', free: true });
  assert.equal(ai.health()[0].toolCalling, 'VERIFIED');
  noSecrets(logs, calls);
});

test('AI_PROVIDER=openrouter: free model, tool call, zero max_price guard sent', async () => {
  const { ai, calls, logs } = harness(() => ok(toolReply), { env: { AI_PROVIDER: 'openrouter' } });
  const out = await ai.chat({ messages: msgs, tools: decl });
  assert.equal(out.toolCalls.length, 1);
  assert.equal(calls[0].provider, 'openrouter');
  assert.equal(calls[0].model, 'or/free-tools:free');
  assert.deepEqual(calls[0].body.provider.max_price, { prompt: 0, completion: 0, request: 0 });
  assert.equal(calls[0].body.provider.require_parameters, true);
  assert.equal(calls[0].auth, `Bearer ${OR_KEY}`);
  const final = await ai.chat({ messages: msgs });
  assert.equal(final.text, ''); // tool reply reused by mock; sticky model reused
  assert.equal(calls[1].model, 'or/free-tools:free');
  noSecrets(logs, calls);
});

test('configured paid model is never called', async () => {
  const { ai, calls, logs } = harness(() => ok(textReply('OK')), { env: { AI_PROVIDER: 'openrouter', OPENROUTER_MODEL: 'or/paid' } });
  await ai.chat({ messages: msgs, tools: decl });
  assert.ok(calls.every((c) => c.model !== 'or/paid'));
  assert.ok(logs.some((l) => l.includes('not confirmed free')));
  const oc = harness(() => ok(textReply('OK')), { env: { AI_PROVIDER: 'opencode', OPENCODE_MODEL: 'paid-pro' } });
  await oc.ai.chat({ messages: msgs });
  assert.deepEqual(oc.calls.map((c) => c.model), ['alpha-free']);
});

test('model fallback: 429, unavailable (404), tool unsupported (400), timeout -> next free model', async () => {
  for (const failure of [err(429), err(404), err(400), 'timeout']) {
    const { ai, calls } = harness((p, model) => {
      if (model !== 'alpha-free') return ok(textReply('OK'));
      if (failure === 'timeout') throw Object.assign(new Error('t'), { name: 'TimeoutError' });
      return failure;
    }, { env: { AI_PROVIDER: 'opencode' } });
    const out = await ai.chat({ messages: msgs, tools: decl });
    assert.equal(out.text, 'OK');
    assert.deepEqual(calls.map((c) => c.model), ['alpha-free', 'beta-free']);
  }
});

test('AI_PROVIDER=auto: OpenRouter model fails -> another free OpenRouter model', async () => {
  const { ai, calls, logs } = harness((p, model) => (model === 'or/free-tools:free' ? err(503) : ok(textReply('OK'))));
  const out = await ai.chat({ messages: msgs, tools: decl });
  assert.equal(out.text, 'OK');
  assert.deepEqual(calls.map((c) => `${c.provider}/${c.model}`), ['openrouter/or/free-tools:free', 'openrouter/or/free-two:free']);
  assert.deepEqual(ai.lastUsed(), { provider: 'openrouter', model: 'or/free-two:free', free: true });
  noSecrets(logs, calls);
});

test('provider fallback: OpenRouter 401 / OpenCode 403 FreeTierError take the whole provider out after one call', async () => {
  const { ai, calls, logs } = harness((p) => (p === 'openrouter' ? err(401) : ok(textReply('OK'))));
  assert.equal((await ai.chat({ messages: msgs, tools: decl })).text, 'OK');
  assert.deepEqual(calls.map((c) => `${c.provider}/${c.model}`), ['openrouter/or/free-tools:free', 'opencode/alpha-free']);
  assert.equal(ai.health().find((h) => h.provider === 'openrouter').available, false);
  assert.ok(ai.health().find((h) => h.provider === 'openrouter').lastFailure.reason.includes('401'));
  noSecrets(logs, calls);

  const blocked = harness((p) => (p === 'opencode' ? err(403) : ok(textReply('OK'))), { env: { AI_PROVIDER: 'opencode' } });
  await assert.rejects(blocked.ai.chat({ messages: msgs }), /All free AI models failed \(1 attempts\)/);
  assert.equal(blocked.calls.length, 1); // no per-model hammering of a provider-wide block
});

test('daily free-quota 429 takes the whole provider out after one call', async () => {
  const { ai, calls } = harness((p) => (p === 'openrouter'
    ? { status: 429, json: { error: { message: 'Rate limit exceeded: free-models-per-day' } } } : ok(textReply('OK'))));
  assert.equal((await ai.chat({ messages: msgs })).text, 'OK');
  assert.deepEqual(calls.map((c) => c.provider), ['openrouter', 'opencode']);
});

test('catalog unavailable for one provider -> other provider used', async () => {
  const { ai, calls } = harness(() => ok(textReply('OK')), { catalogs: { openrouter: new Error('down') } });
  await ai.chat({ messages: msgs });
  assert.deepEqual(calls.map((c) => c.provider), ['opencode']);
});

test('everything fails -> throws (deterministic fallback), bounded attempts, failed models cooled down', async () => {
  const { ai, calls } = harness(() => err(500));
  await assert.rejects(ai.chat({ messages: msgs, tools: decl }), /All free AI models failed/);
  assert.ok(calls.length <= 4, `attempts bounded, got ${calls.length}`);
  const before = calls.length;
  await assert.rejects(ai.chat({ messages: msgs, tools: decl }));
  assert.ok(calls.length - before <= 1, 'cooled-down models are not hammered again'); // only the untried model
});

test('provider plugs into existing agent loop: tool call -> tool result -> final answer', async () => {
  let step = 0;
  const { ai, calls } = harness((p, model, body) => {
    step += 1;
    if (step === 1) return ok(toolReply);
    assert.equal(body.messages.at(-1).role, 'tool'); // tool result fed back to the model
    return ok(textReply('{"final":true}'));
  });
  const state = createAgentState();
  const text = await runAgentLoop({
    ai, systemInstruction: 'SYS', toolDeclarations: decl, initialPrompt: 'go',
    executeTool: async () => ({ predictedDelayMinutes: 3 }), scope: {}, state
  });
  assert.equal(text, '{"final":true}');
  assert.equal(state.known.prediction.predictedDelayMinutes, 3);
  assert.equal(calls.length, 2);
});
