const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true, maxlength: 80 },
    email: { type: String, trim: true, lowercase: true, required: true, unique: true },
    // Named `password` for compatibility with accounts created by earlier versions.
    // Holds a bcrypt hash, never plain text, and is excluded from queries by default.
    password: { type: String, select: false },
    googleId: { type: String, index: { unique: true, sparse: true } },
    avatarUrl: { type: String },
    // True once someone has proved they own the address (Google sign-in does).
    // Password sign-ups start unverified.
    emailVerified: { type: Boolean, default: false },
    // Session tokens carry this number. Bumping it signs out every existing
    // session, such as after a password change.
    tokenVersion: { type: Number, default: 0 },

    // Profile details. `institution` is also the default school name on new question papers.
    institution: { type: String, trim: true, maxlength: 120, default: "" },
    designation: { type: String, trim: true, maxlength: 80, default: "" },
    subjects: { type: [String], default: [] },

    lastLoginAt: { type: Date },
    loginCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

UserSchema.methods.toPublic = function toPublic() {
  return {
    id: String(this._id),
    name: this.name,
    email: this.email,
    avatarUrl: this.avatarUrl || null,
    institution: this.institution || "",
    designation: this.designation || "",
    subjects: this.subjects || [],
    signInMethods: {
      // `password` is only present when the query selected it.
      password: this.password === undefined ? undefined : Boolean(this.password),
      google: Boolean(this.googleId),
    },
    lastLoginAt: this.lastLoginAt || null,
    createdAt: this.createdAt,
  };
};

// Case-insensitive lookup so accounts saved before emails were lowercased still match.
UserSchema.statics.findByEmail = function findByEmail(email, { withPassword = false } = {}) {
  const query = this.findOne({ email: String(email).trim() }).collation({ locale: "en", strength: 2 });
  return withPassword ? query.select("+password") : query;
};

UserSchema.methods.recordLogin = function recordLogin() {
  return this.constructor.updateOne(
    { _id: this._id },
    { $set: { lastLoginAt: new Date() }, $inc: { loginCount: 1 } }
  );
};

module.exports = mongoose.model("User", UserSchema);
