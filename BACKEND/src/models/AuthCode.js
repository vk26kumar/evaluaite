const mongoose = require("mongoose");

const AuthCodeSchema = new mongoose.Schema({
  codeHash: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  notice: { type: String, enum: ["password_removed"] },
  expiresAt: { type: Date, required: true, expires: 0 },
});

module.exports = mongoose.model("AuthCode", AuthCodeSchema);
