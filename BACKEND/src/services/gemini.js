const { GoogleGenAI } = require("@google/genai");
const config = require("../config/env");
const ApiError = require("../utils/ApiError");
const logger = require("../utils/logger");

const BLOCKED_FINISH_REASONS = new Set([
  "SAFETY",
  "RECITATION",
  "BLOCKLIST",
  "PROHIBITED_CONTENT",
  "SPII",
  "IMAGE_SAFETY",
  "IMAGE_PROHIBITED_CONTENT",
]);

let client = null;

function isConfigured() {
  return Boolean(config.gemini.apiKey);
}

function getClient() {
  if (!isConfigured()) {
    throw ApiError.unavailable(
      "AI features aren't configured on the server yet. Set GEMINI_API_KEY and restart the server.",
      "AI_NOT_CONFIGURED"
    );
  }
  if (!client) {
    client = new GoogleGenAI({
      apiKey: config.gemini.apiKey,
      httpOptions: {
        // Per attempt. Reading several handwritten pages can take a while.
        timeout: 120_000,
        // Retries 408, 429 and 5xx once. Kept short because an overloaded model
        // falls back to GEMINI_FALLBACK_MODEL, which is faster than waiting.
        retryOptions: { attempts: 2, initialDelay: 1, maxDelay: 8 },
      },
    });
  }
  return client;
}

/** Turns SDK and network failures into errors that are safe to show users. */
function translateError(err) {
  if (err instanceof ApiError) return err;

  const status = Number(err?.status);
  const message = String(err?.message || "");

  if (status === 401 || status === 403 || (status === 400 && /api key/i.test(message))) {
    return ApiError.unavailable(
      "The server's Gemini API key was rejected. Ask the administrator to update GEMINI_API_KEY.",
      "AI_NOT_CONFIGURED"
    );
  }
  if (status === 404) {
    return ApiError.unavailable(
      `The AI model "${config.gemini.model}" isn't available. Set GEMINI_MODEL to a supported model.`,
      "AI_MODEL_UNAVAILABLE"
    );
  }
  if (status === 429) {
    return ApiError.unavailable(
      "The AI service is at capacity right now. Please try again in a minute.",
      "AI_BUSY"
    );
  }
  if (status === 400) {
    return new ApiError(422, "The AI service couldn't process this content. Check the files and try again.", {
      code: "AI_REJECTED",
    });
  }
  if (err?.name === "AbortError" || err?.name === "TimeoutError" || /timed? ?out|aborted/i.test(message)) {
    return new ApiError(504, "The AI service took too long to respond. Please try again.", {
      code: "AI_TIMEOUT",
    });
  }
  return new ApiError(502, "The AI service is having trouble right now. Please try again shortly.", {
    code: "AI_UPSTREAM",
  });
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    // Some models wrap JSON in a Markdown fence despite the JSON mime type.
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) {
      try {
        return JSON.parse(fenced[1]);
      } catch {
        /* fall through */
      }
    }
    return undefined;
  }
}

const textPart = (text) => ({ text });

const filePart = (buffer, mimeType) => ({
  inlineData: { data: buffer.toString("base64"), mimeType },
});

// Worth trying the next model: overloaded (503), rate-limited (429), server
// error (500) or retired for this key (404). Anything else, such as a bad
// request or blocked content, would fail the same way on every model.
const FALLBACK_STATUSES = new Set([404, 429, 500, 503]);

function modelChain() {
  const { model, fallbackModel } = config.gemini;
  return fallbackModel && fallbackModel !== model ? [model, fallbackModel] : [model];
}

/** One model; malformed or empty output is retried once, since it is usually transient. */
async function generateWithModel(ai, model, { label, system, parts, schema }) {
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const startedAt = Date.now();
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction: system,
        responseMimeType: "application/json",
        responseJsonSchema: schema,
      },
    });

    const candidate = response.candidates?.[0];
    const finishReason = candidate?.finishReason;

    if (response.promptFeedback?.blockReason || BLOCKED_FINISH_REASONS.has(finishReason)) {
      throw new ApiError(422, "The AI declined to process this content.", { code: "AI_BLOCKED" });
    }

    const text = response.text;
    const data = text ? parseJson(text) : undefined;

    if (data && typeof data === "object" && finishReason !== "MAX_TOKENS") {
      logger.info("Gemini request completed", {
        label,
        model,
        ms: Date.now() - startedAt,
        tokens: response.usageMetadata?.totalTokenCount,
      });
      return data;
    }

    logger.warn("Gemini returned unusable output", { label, model, attempt, finishReason, length: text?.length || 0 });
  }

  throw new ApiError(502, "The AI service returned an incomplete answer. Please try again.", {
    code: "AI_BAD_OUTPUT",
  });
}

/**
 * Calls Gemini with a JSON schema and returns the parsed object. When the
 * main model is overloaded or unavailable, the fallback model is used.
 * Pass `meta` to learn which model produced the result (`meta.model`).
 */
async function generateJson({ label, system, parts, schema, meta }) {
  const ai = getClient();
  const models = modelChain();
  let lastError;

  for (const [index, model] of models.entries()) {
    try {
      const data = await generateWithModel(ai, model, { label, system, parts, schema });
      if (meta) meta.model = model;
      if (index > 0) logger.warn("Used the fallback Gemini model", { label, model, primary: models[0] });
      return data;
    } catch (err) {
      lastError = err;
      const status = Number(err?.status);
      const fallingBack = !(err instanceof ApiError) && index < models.length - 1 && FALLBACK_STATUSES.has(status);
      logger.warn("Gemini request failed", { label, model, status, message: err?.message, fallingBack });
      if (!fallingBack) break;
    }
  }

  throw translateError(lastError);
}

/** For tests: replace the SDK client. */
function setClientForTests(fake) {
  client = fake;
}

module.exports = {
  isConfigured,
  generateJson,
  textPart,
  filePart,
  translateError,
  modelName: () => config.gemini.model,
  setClientForTests,
};
