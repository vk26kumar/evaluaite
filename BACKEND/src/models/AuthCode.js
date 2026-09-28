const mongoose = require("mongoose");

/**
 * Single-use code handed to the browser after Google sign-in. The browser
 * exchanges it for a session token, so the token itself never appears in a URL.
 * Only a SHA-256 hash is stored; MongoDB's TTL index removes expired codes.
 */
const AuthCodeSchema = new mongoose.Schema({
  codeHash: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
});

module.exports = mongoose.model("AuthCode", AuthCodeSchema);
