const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true, maxlength: 80 },
    email: { type: String, trim: true, lowercase: true, required: true, unique: true },
    password: { type: String, select: false },
    googleId: { type: String, index: { unique: true, sparse: true } },
    avatarUrl: { type: String },
    emailVerified: { type: Boolean, default: false },
    tokenVersion: { type: Number, default: 0 },
    recoveryCodes: { type: [String], select: false, default: undefined },
    recoveryCodesCreatedAt: { type: Date },

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
    emailVerified: Boolean(this.emailVerified),
    avatarUrl: this.avatarUrl || null,
    institution: this.institution || "",
    designation: this.designation || "",
    subjects: this.subjects || [],
    signInMethods: {
      password: this.password === undefined ? undefined : Boolean(this.password),
      google: Boolean(this.googleId),
    },
    lastLoginAt: this.lastLoginAt || null,
    createdAt: this.createdAt,
  };
};

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
