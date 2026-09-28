const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const config = require("../config/env");

function signSessionToken(user) {
  return jwt.sign({ sub: String(user._id || user.id) }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
  });
}

function verifySessionToken(token) {
  return jwt.verify(token, config.jwt.secret, {
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
  });
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

module.exports = { signSessionToken, verifySessionToken, randomToken, sha256 };
