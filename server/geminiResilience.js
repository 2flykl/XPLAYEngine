const TRANSIENT = new Set([408, 429, 500, 502, 503, 504]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function uniq(list = []) {
  return [...new Set(list.map((x) => String(x || '').trim()).filter(Boolean))];
}

export function modelCascade(primary = '') {
  const envFallbacks = String(process.env.GEMINI_VISION_FALLBACK_MODELS || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

  // Current stable multimodal fallbacks. Environment config always wins first.
  return uniq([
    primary,
    ...envFallbacks,
    'gemini-3.7-flash',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite'
  ]);
}

export class GeminiCapacityError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'GeminiCapacityError';
    this.retryable = true;
    this.status = 503;
    this.details = details;
  }
}

function parseApiError(status, raw = '') {
  let parsed = null;
  try { parsed = JSON.parse(raw); } catch {}
  const message = parsed?.error?.message || parsed?.message || raw || `Gemini HTTP ${status}`;
  const statusText = parsed?.error?.status || parsed?.status || '';
  return { status, statusText, message: String(message).slice(0, 1600), parsed };
}

export async function resilientGeminiText({
  apiKey,
  primaryModel,
  parts,
  temperature = 0.2,
  maxAttemptsPerModel = Number(process.env.GEMINI_RETRY_ATTEMPTS || 3),
  baseDelayMs = Number(process.env.GEMINI_RETRY_BASE_MS || 850),
  maxDelayMs = Number(process.env.GEMINI_RETRY_MAX_MS || 7000),
  requestTimeoutMs = Number(process.env.GEMINI_REQUEST_TIMEOUT_MS || 55000),
  label = 'vision'
} = {}) {
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured.');

  const models = modelCascade(primaryModel);
  const attempts = [];
  let lastError = null;

  for (const model of models) {
    for (let attempt = 1; attempt <= Math.max(1, maxAttemptsPerModel); attempt++) {
      const startedAt = Date.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const r = await fetch(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ role: 'user', parts }],
            generationConfig: { temperature }
          })
        });
        const raw = await r.text();
        clearTimeout(timer);

        if (r.ok) {
          const body = JSON.parse(raw);
          const text = body?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('').trim();
          if (!text) throw new Error('Gemini returned no text.');
          attempts.push({ model, attempt, ok: true, status: r.status, ms: Date.now() - startedAt });
          return { text, modelUsed: model, attempts };
        }

        const apiError = parseApiError(r.status, raw);
        attempts.push({ model, attempt, ok: false, status: r.status, apiStatus: apiError.statusText, ms: Date.now() - startedAt });
        lastError = apiError;

        if (!TRANSIENT.has(r.status)) {
          const err = new Error(`Gemini HTTP ${r.status}: ${apiError.message}`);
          err.status = r.status;
          err.retryable = false;
          err.details = { label, attempts, modelsTried: uniq(attempts.map((x) => x.model)) };
          throw err;
        }

        if (attempt < maxAttemptsPerModel) {
          const exp = Math.min(maxDelayMs, baseDelayMs * (2 ** (attempt - 1)));
          const jitter = Math.floor(Math.random() * Math.max(150, exp * 0.35));
          await sleep(exp + jitter);
        }
      } catch (e) {
        clearTimeout(timer);
        if (e?.retryable === false) throw e;

        const transientNetwork = e?.name === 'AbortError' || e instanceof TypeError;
        if (!transientNetwork && !String(e?.message || '').includes('Gemini returned no text')) {
          // HTTP transient errors are already recorded above; continue to next attempt/model.
          if (e?.status && !TRANSIENT.has(e.status)) throw e;
        } else {
          attempts.push({ model, attempt, ok: false, status: e?.name === 'AbortError' ? 408 : 0, error: e?.message || String(e), ms: Date.now() - startedAt });
          lastError = { status: e?.name === 'AbortError' ? 408 : 0, statusText: e?.name || 'NETWORK', message: e?.message || String(e) };
        }

        if (attempt < maxAttemptsPerModel) {
          const exp = Math.min(maxDelayMs, baseDelayMs * (2 ** (attempt - 1)));
          const jitter = Math.floor(Math.random() * Math.max(150, exp * 0.35));
          await sleep(exp + jitter);
        }
      }
    }
  }

  throw new GeminiCapacityError(
    'Gemini Vision is temporarily busy after automatic retries and model failover.',
    {
      label,
      attempts,
      modelsTried: uniq(attempts.map((x) => x.model)),
      lastError,
      retryPolicy: { maxAttemptsPerModel, baseDelayMs, maxDelayMs, requestTimeoutMs }
    }
  );
}
