const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { spawnSync } = require("child_process");

// Loads the config in a fresh process, since it is read once at startup.
function databaseFor(env) {
  const result = spawnSync(
    process.execPath,
    ["-e", "process.stdout.write(JSON.stringify(require('./src/config/env').mongoDbName ?? null))"],
    {
      cwd: path.join(__dirname, ".."),
      encoding: "utf8",
      env: {
        PATH: process.env.PATH,
        SYSTEMROOT: process.env.SYSTEMROOT,
        JWT_SECRET: "a-test-secret-that-is-long-enough-for-production",
        MONGO_DB_NAME: "",
        ...env,
      },
    }
  );
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

const noDatabase = "mongodb+srv://user:pass@cluster.example.net/?retryWrites=true";

test("local development never uses the production database by default", () => {
  assert.equal(databaseFor({ NODE_ENV: "development", MONGO_URI: noDatabase }), "evaluaite-dev");
  assert.equal(databaseFor({ NODE_ENV: "development", MONGO_URI: "mongodb://localhost:27017" }), "evaluaite-dev");
});

test("production keeps the database it has always used", () => {
  // No name in the URI: the driver's default, where existing data lives.
  assert.equal(databaseFor({ NODE_ENV: "production", MONGO_URI: noDatabase }), null);
});

test("a database named in the URI or MONGO_DB_NAME wins", () => {
  assert.equal(databaseFor({ NODE_ENV: "development", MONGO_URI: "mongodb+srv://u:p@host.example/school?w=1" }), null);
  assert.equal(databaseFor({ NODE_ENV: "production", MONGO_URI: noDatabase, MONGO_DB_NAME: "live" }), "live");
  assert.equal(databaseFor({ NODE_ENV: "development", MONGO_URI: noDatabase, MONGO_DB_NAME: "mine" }), "mine");
});
