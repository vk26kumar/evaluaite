require("./setup");
process.env.GEMINI_API_KEY = "test-key";
process.env.GEMINI_MODEL = "primary-model";
process.env.GEMINI_FALLBACK_MODEL = "fallback-model";

const test = require("node:test");
const assert = require("node:assert/strict");
const gemini = require("../src/services/gemini");
const ApiError = require("../src/utils/ApiError");

const ok = (data) => ({ candidates: [{ finishReason: "STOP" }], text: JSON.stringify(data), usageMetadata: {} });
const httpError = (status) => Object.assign(new Error(`status ${status}`), { status });

function fakeClient(behaviour) {
  const calls = [];
  gemini.setClientForTests({
    models: {
      generateContent: async ({ model }) => {
        calls.push(model);
        return behaviour(model, calls.length);
      },
    },
  });
  return calls;
}

const request = (meta) => gemini.generateJson({ label: "test", system: "s", parts: [{ text: "p" }], schema: {}, meta });

test("uses the main model when it works", async () => {
  const calls = fakeClient(() => ok({ answer: 1 }));
  const meta = {};
  assert.deepEqual(await request(meta), { answer: 1 });
  assert.deepEqual(calls, ["primary-model"]);
  assert.equal(meta.model, "primary-model");
});

for (const status of [503, 429, 500, 404]) {
  test(`falls back when the main model returns ${status}`, async () => {
    const calls = fakeClient((model) => {
      if (model === "primary-model") throw httpError(status);
      return ok({ answer: 2 });
    });
    const meta = {};
    assert.deepEqual(await request(meta), { answer: 2 });
    assert.deepEqual(calls, ["primary-model", "fallback-model"]);
    assert.equal(meta.model, "fallback-model", "records which model did the work");
  });
}

test("does not fall back on a bad request or a rejected key", async () => {
  for (const status of [400, 401, 403]) {
    const calls = fakeClient(() => {
      throw httpError(status);
    });
    await assert.rejects(request(), ApiError);
    assert.deepEqual(calls, ["primary-model"], `status ${status} should not try another model`);
  }
});

test("reports a clear error when both models are overloaded", async () => {
  const calls = fakeClient(() => {
    throw httpError(503);
  });
  await assert.rejects(request(), (err) => err instanceof ApiError && err.status === 502);
  assert.deepEqual(calls, ["primary-model", "fallback-model"]);
});

test("blocked content is never retried on another model", async () => {
  const calls = fakeClient(() => ({ candidates: [{ finishReason: "SAFETY" }], text: "" }));
  await assert.rejects(request(), (err) => err.code === "AI_BLOCKED");
  assert.deepEqual(calls, ["primary-model"]);
});
