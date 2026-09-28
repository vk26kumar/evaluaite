const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const config = require("./config/env");
const { configurePassport } = require("./config/passport");
const logger = require("./utils/logger");
const { apiLimiter } = require("./middleware/rateLimit");
const { notFound, errorHandler } = require("./middleware/error");

const healthRoutes = require("./routes/health.routes");
const authRoutes = require("./routes/auth.routes");
const evaluationRoutes = require("./routes/evaluation.routes");
const aiRoutes = require("./routes/ai.routes");
const slidesRoutes = require("./routes/slides.routes");
const assignmentRoutes = require("./routes/assignment.routes");
const profileRoutes = require("./routes/profile.routes");

function requestLogger(req, res, next) {
  const startedAt = process.hrtime.bigint();
  res.on("finish", () => {
    if (req.path === "/api/health") return;
    const ms = Number(process.hrtime.bigint() - startedAt) / 1e6;
    logger.info("request", { method: req.method, path: req.originalUrl.split("?")[0], status: res.statusCode, ms: Math.round(ms) });
  });
  next();
}

function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", config.trustProxy);

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        // Requests without an Origin header (curl, server-to-server) carry no
        // browser credentials, so CORS doesn't apply to them.
        callback(null, !origin || config.clientUrls.includes(origin));
      },
      exposedHeaders: ["Content-Disposition"],
      maxAge: 600,
    })
  );
  app.use(express.json({ limit: "200kb" }));
  app.use(requestLogger);
  app.use(configurePassport().initialize());

  app.use("/api/health", healthRoutes);
  app.use("/api", apiLimiter);
  app.use("/api/auth", authRoutes);
  app.use("/api/evaluations", evaluationRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/slides", slidesRoutes);
  app.use("/api/assignments", assignmentRoutes);
  app.use("/api/profile", profileRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
