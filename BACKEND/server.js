const config = require("./src/config/env");
const logger = require("./src/utils/logger");
const { createApp } = require("./src/app");
const { connectDatabase, disconnectDatabase } = require("./src/config/db");
const jobs = require("./src/services/evaluation.jobs");
const assignmentJobs = require("./src/services/assignment.jobs");
const gemini = require("./src/services/gemini");

async function start() {
  await connectDatabase();
  await jobs.recoverInterruptedJobs();
  await assignmentJobs.recoverInterruptedJobs();

  const app = createApp();
  const server = app.listen(config.port, () => {
    logger.info(`Server listening on port ${config.port}`, {
      env: config.nodeEnv,
      clients: config.clientUrls,
      ai: gemini.isConfigured() ? config.gemini.model : "not configured",
      googleSignIn: config.google.enabled,
    });
  });

  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;
  server.requestTimeout = 5 * 60_000;

  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} received, shutting down`);
    server.close(async () => {
      await disconnectDatabase().catch(() => {});
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", { error: logger.serializeError(reason) });
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception", { error: logger.serializeError(err) });
  process.exit(1);
});

start().catch((err) => {
  logger.error("Failed to start server", { error: logger.serializeError(err) });
  process.exit(1);
});
