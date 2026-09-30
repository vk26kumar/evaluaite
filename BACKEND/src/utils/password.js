const bcrypt = require("bcryptjs");
const { z } = require("zod");
const ApiError = require("./ApiError");

const BCRYPT_ROUNDS = 12;
const MAX_BYTES = 72;

const COMMON_PASSWORDS = new Set([
  "password1", "password12", "password123", "password1234", "passw0rd", "p@ssw0rd", "p@ssword1",
  "abc12345", "abcd1234", "abc123456", "a1b2c3d4", "a1234567", "aa123456", "asdf1234", "asdfgh123",
  "qwerty12", "qwerty123", "qwerty1234", "qwertyuiop1", "q1w2e3r4", "q1w2e3r4t5", "1q2w3e4r", "1q2w3e4r5t",
  "1qaz2wsx", "zaq12wsx", "zxcvbnm1", "iloveyou1", "iloveyou2", "welcome1", "welcome123", "admin123",
  "admin1234", "administrator1", "letmein1", "letmein123", "monkey123", "dragon123", "sunshine1",
  "princess1", "football1", "baseball1", "master123", "shadow123", "michael1", "superman1", "trustno1",
  "test1234", "test12345", "testing123", "hello123", "hello1234", "changeme1", "computer1", "internet1",
  "india123", "india@123", "bharat123", "teacher1", "teacher123", "student1", "student123", "school123",
  "school1234", "exam1234", "evaluaite1", "evaluate1", "welcome@123", "pass1234", "pass@123", "user1234",
]);

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .refine((value) => Buffer.byteLength(value, "utf8") <= MAX_BYTES, "Password must be at most 72 characters.")
  .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), "Use at least one letter and one number.")
  .refine((value) => !COMMON_PASSWORDS.has(value.toLowerCase()), "This password is too common. Choose something harder to guess.");

function assertNotPersonal(password, email, field = "password") {
  const local = String(email || "").split("@")[0].toLowerCase();
  if (local.length >= 4 && password.toLowerCase().includes(local)) {
    const message = "Don't use your email address in your password.";
    throw ApiError.badRequest(message, [{ field, message }]);
  }
}

const hashPassword = (password) => bcrypt.hash(password, BCRYPT_ROUNDS);
const verifyPassword = (password, hash) => bcrypt.compare(password, hash);
const DUMMY_HASH = bcrypt.hashSync("timing-safe-placeholder", BCRYPT_ROUNDS);

module.exports = { passwordSchema, assertNotPersonal, hashPassword, verifyPassword, DUMMY_HASH, COMMON_PASSWORDS };
