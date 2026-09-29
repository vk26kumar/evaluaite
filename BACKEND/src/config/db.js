const mongoose = require("mongoose");
const config = require("./env");
const logger = require("../utils/logger");

mongoose.set("strictQuery", true);

async function connectDatabase() {
  if (!config.mongoUri) {
    throw new Error("MONGO_URI is not set. Add it to BACKEND/.env (see .env.example).");
  }

  mongoose.connection.on("disconnected", () => logger.warn("MongoDB disconnected"));
  mongoose.connection.on("reconnected", () => logger.info("MongoDB reconnected"));

  await mongoose.connect(config.mongoUri, {
    ...(config.mongoDbName ? { dbName: config.mongoDbName } : {}),
    serverSelectionTimeoutMS: 10_000,
    autoIndex: !config.isProd || process.env.MONGO_AUTO_INDEX === "true",
  });
  logger.info("MongoDB connected", { database: mongoose.connection.name });
}

function disconnectDatabase() {
  return mongoose.disconnect();
}

module.exports = { connectDatabase, disconnectDatabase };
