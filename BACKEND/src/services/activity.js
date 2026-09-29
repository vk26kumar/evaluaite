const Activity = require("../models/Activity");
const logger = require("../utils/logger");

async function logActivity(user, type, { kind, id, title, meta } = {}) {
  try {
    await Activity.create({
      user: user?._id || user,
      type,
      entity: kind ? { kind, id: id || undefined, title: String(title || "").slice(0, 200) } : undefined,
      meta: meta || {},
    });
  } catch (err) {
    logger.warn("Could not record activity", { type, message: err.message });
  }
}

module.exports = { logActivity };
