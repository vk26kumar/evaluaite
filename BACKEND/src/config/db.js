const dns = require("dns");
const mongoose = require("mongoose");
const config = require("./env");
const logger = require("../utils/logger");

mongoose.set("strictQuery", true);

const PUBLIC_DNS = ["8.8.8.8", "1.1.1.1"];

const isSrvLookupFailure = (err) =>
  /querySrv|queryTxt/.test(String(err?.message)) && /ECONNREFUSED|ETIMEOUT|ESERVFAIL/.test(String(err?.message));

async function connect(uri, options) {
  try {
    return await mongoose.connect(uri, options);
  } catch (err) {
    if (!uri.startsWith("mongodb+srv://") || !isSrvLookupFailure(err)) throw err;
    logger.warn("The system DNS couldn't resolve the MongoDB address; retrying with public DNS", { message: err.message });
    dns.setServers(PUBLIC_DNS);
    return mongoose.connect(uri, options);
  }
}

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

  await connect(config.mongoUri, {
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

module.exports = { connect, connectDatabase, disconnectDatabase };
