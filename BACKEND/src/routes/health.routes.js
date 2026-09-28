const express = require("express");
const mongoose = require("mongoose");
const gemini = require("../services/gemini");
const jobs = require("../services/evaluation.jobs");

const router = express.Router();

router.get("/", (req, res) => {
  const database = mongoose.connection.readyState === 1 ? "up" : "down";
  res.status(database === "up" ? 200 : 503).json({
    status: database === "up" ? "ok" : "degraded",
    database,
    ai: gemini.isConfigured() ? "configured" : "not_configured",
    jobs: jobs.stats(),
    uptimeSeconds: Math.round(process.uptime()),
  });
});

module.exports = router;
