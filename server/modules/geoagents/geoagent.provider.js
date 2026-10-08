/**
 * GeoAgent LLM provider adapter: OpenCode Zen and OpenRouter (both OpenAI-compatible /chat/completions).
 * Server-only. API keys are read from env and never logged or sent to the model.
 *
 * FREE MODELS ONLY: a model is called only after its provider's live catalog confirms it is free
 * (OpenRouter: every listed price is 0; OpenCode: the `-free` id suffix OpenCode uses for free models).
 * AI_PROVIDER=auto tries OpenRouter, then OpenCode. If no free model works, chat() throws and the caller uses the deterministic fallback.
 */

const REQUEST_TIMEOUT_MS = 60000;
const CATALOG_TTL_MS = 10 * 60 * 1000;
const COOLDOWN_MS = 60 * 1000; // a failed model is skipped for this long (no hammering)
const AUTH_COOLDOWN_MS = 10 * 60 * 1000; // 401/403 (bad key, free tier not allowed server-side): whole provider
const MAX_ATTEMPTS_PER_CALL = 4; // model attempts per chat() across all providers
const MAX_MODELS_PER_PROVIDER = 3;
const MIN_CONTEXT_TOKENS = 16000;

const parseArgs = (raw) => {
  if (raw && typeof raw === 'object') return raw;
  try {
    const parsed = JSON.parse(raw || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const isZeroPrice = (v) => v !== null && v !== undefined && v !== '' && Number(v) === 0;

/**
 * Provider definitions. isFree/supportsTools read one catalog entry from GET {baseUrl}/models.
 * supportsTools returns null when the catalog does not say (verified at call time instead).
 */
export const PROVIDERS = Object.freeze({
  opencode: {
    label: 'OpenCode',
    keyEnv: 'OPENCODE_API_KEY',
    modelEnv: 'OPENCODE_MODEL',
    baseUrlEnv: 'OPENCODE_BASE_URL',
    defaultBaseUrl: 'https://opencode.ai/zen/v1',
    isFree: (m) => typeof m.id === 'string' && /-free$/.test(m.id),
    supportsTools: () => null
  },
  openrouter: {
    label: 'OpenRouter',
    keyEnv: 'OPENROUTER_API_KEY',
    modelEnv: 'OPENROUTER_MODEL',
    baseUrlEnv: 'OPENROUTER_BASE_URL',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    isFree: (m) => {
      const prices = m.pricing && typeof m.pricing === 'object' ? Object.values(m.pricing) : [];
      return prices.length > 0 && prices.every(isZeroPrice);
    },
    supportsTools: (m) => Array.isArray(m.supported_parameters) && m.supported_parameters.includes('tools'),
    // Server-side guard: OpenRouter refuses to route to any endpoint that would charge, or that lacks tool support.
    extraBody: { provider: { max_price: { prompt: 0, completion: 0, request: 0 }, require_parameters: true } }
  }
});

const providerError = (label, message, extra = {}) => Object.assign(new Error(`${label} ${message}`), extra);

/**
 * Low-level OpenAI-compatible chat client for one provider.
 * @returns {{chat: Function}|null} null when no API key is configured
 */
export const createChatClient = ({
  label = 'OpenCode',
  apiKey,
  baseUrl = PROVIDERS.opencode.defaultBaseUrl,
  extraBody,
  fetchImpl = globalThis.fetch,
  timeoutMs = REQUEST_TIMEOUT_MS
} = {}) => {
  if (!apiKey) return null;
  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const scrub = (s) => String(s).split(apiKey).join('[redacted]');

  return {
    /**
     * @param {{model: string, messages: Array, tools?: Array}} req tools = [{name, description, parameters}]
     * @returns {Promise<{text: string, toolCalls: Array<{id, name, args}>}>}
     */
    async chat({ model, messages, tools }) {
      const body = { ...extraBody, model, messages, temperature: 0 };
      if (tools && tools.length) {
        body.tools = tools.map((fn) => ({ type: 'function', function: fn }));
        body.tool_choice = 'auto';
      }

      let res;
      try {
        res = await fetchImpl(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(timeoutMs)
        });
      } catch (err) {
        const timedOut = err && (err.name === 'TimeoutError' || err.name === 'AbortError');
        throw providerError(label, timedOut ? 'request timed out' : 'request failed (network)', { status: 0, timedOut });
      }

      if (!res.ok) {
        let detail = '';
        try {
          const err = (await res.json()).error || {};
          detail = scrub([err.type, err.message].filter(Boolean).join(': ')).slice(0, 200);
        } catch { /* non-JSON error body */ }
        throw providerError(label, `request failed (HTTP ${res.status})${detail ? `: ${detail}` : ''}`, { status: res.status });
      }

      const data = await res.json();
      const message = data && Array.isArray(data.choices) && data.choices[0] && data.choices[0].message;
      if (!message) throw providerError(label, 'returned an invalid response (no message)', { status: 0 });

      const toolCalls = (message.tool_calls || [])
        .filter((c) => c && c.function && typeof c.function.name === 'string')
        .map((c, i) => ({ id: c.id || `call_${i}`, name: c.function.name, args: parseArgs(c.function.arguments) }));

      return { text: typeof message.content === 'string' ? message.content : '', toolCalls };
    }
  };
};

/** Back-compat: OpenCode client from env (used by existing callers/tests). */
export const createOpenCodeClient = ({
  apiKey = process.env.OPENCODE_API_KEY,
  baseUrl = process.env.OPENCODE_BASE_URL || PROVIDERS.opencode.defaultBaseUrl,
  ...rest
} = {}) => createChatClient({ label: 'OpenCode', apiKey, baseUrl, ...rest });

/**
 * Free, tool-capable candidates from a catalog, preferred model first.
 * A configured model that the catalog does not confirm as free is never returned.
 */
export const selectFreeModels = (def, catalog, preferred) => {
  const eligible = catalog.filter((m) => m && def.isFree(m)
    && def.supportsTools(m) !== false
    && !(Number.isFinite(m.context_length) && m.context_length < MIN_CONTEXT_TOKENS));
  const ids = eligible.map((m) => m.id);
  if (preferred && ids.includes(preferred)) return [preferred, ...ids.filter((id) => id !== preferred)];
  return ids;
};

const providerOrder = (setting) => {
  const s = String(setting || 'auto').toLowerCase();
  if (s === 'opencode' || s === 'openrouter') return [s];
  // OpenRouter first: OpenCode's free tier currently rejects server-side calls (403 FreeTierError).
  return ['openrouter', 'opencode'];
};

/**
 * Provider-agnostic LLM used by the GeoAgent loop. Same chat({messages, tools}) shape as createChatClient;
 * picks a free tool-capable model, falls back across models then providers, and throws when all fail.
 * @returns {{chat: Function, health: Function, lastUsed: Function}|null} null when no selected provider has a key
 */
export const createLlmProvider = ({
  env = process.env,
  fetchImpl = globalThis.fetch,
  now = Date.now,
  timeoutMs = REQUEST_TIMEOUT_MS,
  log = console
} = {}) => {
  const names = providerOrder(env.AI_PROVIDER).filter((n) => env[PROVIDERS[n].keyEnv]);
  if (names.length === 0) return null;

  const status = {};
  for (const n of names) {
    const def = PROVIDERS[n];
    const baseUrl = env[def.baseUrlEnv] || def.defaultBaseUrl;
    status[n] = {
      def,
      baseUrl,
      client: createChatClient({ label: def.label, apiKey: env[def.keyEnv], baseUrl, extraBody: def.extraBody, fetchImpl, timeoutMs }),
      catalog: null,
      catalogAt: 0,
      providerDownUntil: 0,
      modelDownUntil: {},
      toolsVerified: {},
      model: null,
      lastFailure: null
    };
  }
  let sticky = null; // { name, model } that last succeeded

  const fail = (s, reason, model) => {
    s.lastFailure = { reason, model: model || null, at: new Date(now()).toISOString() };
    log.warn(`[GeoAgent AI] ${s.def.label}${model ? ` model=${model}` : ''} failed: ${reason}`);
  };

  const loadCatalog = async (s) => {
    if (s.catalog && now() - s.catalogAt < CATALOG_TTL_MS) return s.catalog;
    const res = await fetchImpl(`${s.baseUrl.replace(/\/+$/, '')}/models`, {
      headers: { Authorization: `Bearer ${env[s.def.keyEnv]}` },
      signal: AbortSignal.timeout(15000)
    });
    if (!res.ok) throw Object.assign(new Error(`model catalog HTTP ${res.status}`), { status: res.status });
    const data = await res.json();
    s.catalog = Array.isArray(data && data.data) ? data.data : [];
    s.catalogAt = now();
    return s.catalog;
  };

  const candidatesFor = async (name) => {
    const s = status[name];
    if (s.providerDownUntil > now()) return [];
    let catalog;
    try {
      catalog = await loadCatalog(s);
    } catch (err) {
      s.providerDownUntil = now() + COOLDOWN_MS;
      fail(s, err.message);
      return [];
    }
    const preferred = env[s.def.modelEnv];
    const models = selectFreeModels(s.def, catalog, preferred);
    if (preferred && !models.includes(preferred)) {
      fail(s, `configured model "${preferred}" is not confirmed free + tool-capable; not calling it`, preferred);
    }
    return models.filter((m) => !(s.modelDownUntil[m] > now())).slice(0, MAX_MODELS_PER_PROVIDER);
  };

  return {
    async chat({ messages, tools }) {
      const queue = [];
      if (sticky) queue.push(sticky);
      for (const name of names) {
        for (const model of await candidatesFor(name)) {
          if (!queue.some((q) => q.name === name && q.model === model)) queue.push({ name, model });
        }
      }

      const errors = [];
      let attempts = 0;
      for (const { name, model } of queue) {
        const s = status[name];
        if (attempts >= MAX_ATTEMPTS_PER_CALL) break;
        if (s.providerDownUntil > now() || s.modelDownUntil[model] > now()) continue;
        // Re-check against the catalog right before calling: never call a model not confirmed free.
        if (!selectFreeModels(s.def, s.catalog || [], null).includes(model)) continue;

        attempts += 1;
        try {
          const out = await s.client.chat({ model, messages, tools });
          if (tools && tools.length && out.toolCalls.length) s.toolsVerified[model] = true;
          if (!sticky || sticky.name !== name || sticky.model !== model) {
            log.info(`[GeoAgent AI] using ${s.def.label} free model=${model}`);
          }
          sticky = { name, model };
          s.model = model;
          return out;
        } catch (err) {
          errors.push(`${s.def.label}/${model}: ${err.message}`);
          if (sticky && sticky.name === name && sticky.model === model) sticky = null;
          // 401/403 and daily free-quota 429s apply to the whole provider, not one model
          const providerWide = err.status === 401 || err.status === 403 || (err.status === 429 && /per-day/i.test(err.message));
          if (providerWide) s.providerDownUntil = now() + AUTH_COOLDOWN_MS;
          else s.modelDownUntil[model] = now() + COOLDOWN_MS; // 429/404/400/5xx/timeout: try next model
          fail(s, err.message, model);
        }
      }

      throw new Error(errors.length
        ? `All free AI models failed (${errors.length} attempts): ${errors.join(' | ')}`
        : 'No free tool-capable AI model available');
    },

    lastUsed: () => (sticky ? { provider: sticky.name, model: sticky.model, free: true } : null),

    /** Lightweight, network-free snapshot for provider health. */
    health: () => names.map((n) => {
      const s = status[n];
      return {
        provider: n,
        model: s.model || env[s.def.modelEnv] || null,
        free: true,
        toolCalling: s.model ? (s.toolsVerified[s.model] ? 'VERIFIED' : (s.def.supportsTools({}) === null ? 'UNVERIFIED' : 'CATALOG')) : 'UNKNOWN',
        available: s.providerDownUntil <= now(),
        lastFailure: s.lastFailure
      };
    })
  };
};
