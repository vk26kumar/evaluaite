/**
 * One in-process queue for all background AI work (grading sheets and
 * generating papers), so the concurrency cap bounds total memory and
 * AI usage no matter which feature is busy.
 *
 * This assumes a single server instance. Callers mark jobs interrupted by a
 * restart as failed at startup.
 */
const config = require("../config/env");
const logger = require("../utils/logger");

const queue = [];
let active = 0;

function hasCapacity() {
  return queue.length < config.jobs.maxQueued;
}

function enqueue(label, run) {
  queue.push({ label, run });
  pump();
}

function pump() {
  while (active < config.jobs.maxConcurrent && queue.length > 0) {
    const job = queue.shift();
    active += 1;
    Promise.resolve()
      .then(job.run)
      .catch((err) => logger.error("Background job crashed", { label: job.label, error: logger.serializeError(err) }))
      .finally(() => {
        active -= 1;
        pump();
      });
  }
}

function stats() {
  return { active, queued: queue.length };
}

module.exports = { enqueue, hasCapacity, stats };
