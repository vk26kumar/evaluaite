const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { spawn } = require("child_process");

const START = "require('./src/app').createApp().listen(0, function () { process.stdout.write('PORT=' + this.address().port + '\\n'); })";

async function startWithLimits() {
  const child = spawn(process.execPath, ["-e", START], {
    cwd: path.join(__dirname, ".."),
    env: {
      PATH: process.env.PATH,
      SYSTEMROOT: process.env.SYSTEMROOT,
      NODE_ENV: "development",
      JWT_SECRET: "a-test-secret-that-is-long-enough-for-production",
      MONGO_URI: "",
      EMAIL_PROVIDER: "none",
      GEMINI_API_KEY: "",
      GEMINI_API: "",
    },
  });
  const port = await new Promise((resolve, reject) => {
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
      const match = /PORT=(\d+)/.exec(output);
      if (match) resolve(Number(match[1]));
    });
    child.on("exit", (code) => reject(new Error(`server exited with ${code}`)));
  });
  return { base: `http://127.0.0.1:${port}`, stop: () => child.kill() };
}

const post = (base, route) =>
  fetch(base + route, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });

test("failed link attempts are limited without locking out sign-in or sign-up", async () => {
  const { base, stop } = await startWithLimits();
  try {
    for (let i = 0; i < 20; i += 1) {
      assert.equal((await post(base, "/api/auth/email/verify")).status, 400);
    }
    const limited = await post(base, "/api/auth/email/verify");
    assert.equal(limited.status, 429);
    assert.equal((await limited.json()).error.code, "RATE_LIMITED");
    assert.ok(limited.headers.get("ratelimit-policy"));

    assert.equal((await post(base, "/api/auth/login")).status, 400, "login has its own budget");
    assert.equal((await post(base, "/api/auth/signup")).status, 400, "sign-up has its own budget");
  } finally {
    stop();
  }
});
