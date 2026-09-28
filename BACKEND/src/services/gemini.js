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
        // Retries 408, 429 and 5xx responses with exponential backoff.
        retryOptions: { attempts: 3, initialDelay: 2, maxDelay: 20 },
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

/**
 * Calls Gemini with a JSON schema and returns the parsed object.
 * Malformed or empty output is retried once, since it is usually transient.
 */
async function generateJson({ label, system, parts, schema }) {
  const ai = getClient();
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const startedAt = Date.now();
    let response;

    try {
      response = await ai.models.generateContent({
        model: config.gemini.model,
        contents: [{ role: "user", parts }],
        config: {
          systemInstruction: system,
          responseMimeType: "application/json",
          responseJsonSchema: schema,
        },
      });
    } catch (err) {
      logger.warn("Gemini request failed", { label, status: err?.status, message: err?.message });
      throw translateError(err);
    }

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
        model: config.gemini.model,
        ms: Date.now() - startedAt,
        tokens: response.usageMetadata?.totalTokenCount,
      });
      return data;
    }

    logger.warn("Gemini returned unusable output", { label, attempt, finishReason, length: text?.length || 0 });
  }

  throw new ApiError(502, "The AI service returned an incomplete answer. Please try again.", {
    code: "AI_BAD_OUTPUT",
  });
}

module.exports = { isConfigured, generateJson, textPart, filePart, translateError, modelName: () => config.gemini.model };
