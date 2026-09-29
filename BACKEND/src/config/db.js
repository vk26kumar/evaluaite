const mongoose = require("mongoose");
const config = require("./env");
const logger = require("../utils/logger");

mongoose.set("strictQuery", true);

async function ensureIndexes() {
  const results = await Promise.allSettled(mongoose.modelNames().map((name) => mongoose.model(name).createIndexes()));
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      logger.warn("Could not create indexes", { model: mongoose.modelNames()[index], message: result.reason?.message });
    }
  });
}

async function connectDatabase() {
  if (!config.mongoUri) {
    throw new Error("MONGO_URI is not set. Add it to BACKEND/.env (see .env.example).");
  }

  mongoose.connection.on("disconnected", () => logger.warn("MongoDB disconnected"));
  mongoose.connection.on("reconnected", () => logger.info("MongoDB reconnected"));

  await mongoose.connect(config.mongoUri, {
    ...(config.mongoDbName ? { dbName: config.mongoDbName } : {}),
    serverSelectionTimeoutMS: 10_000,
    autoIndex: false,
  });
  await ensureIndexes();
  logger.info("MongoDB connected", { database: mongoose.connection.name, models: mongoose.modelNames().length });
}

function disconnectDatabase() {
  return mongoose.disconnect();
}

module.exports = { connectDatabase, disconnectDatabase };
