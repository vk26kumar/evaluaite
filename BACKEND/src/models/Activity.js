const mongoose = require("mongoose");

/**
 * An append-only log of what a user did: created, copied, regenerated and
 * deleted assignments, graded and deleted sheets, adjusted marks, and so on.
 * Entries keep a snapshot of the item's title, so the history still reads
 * correctly after the item itself is deleted.
 */
const ACTIVITY_TYPES = [
  "account.created",
  "account.updated",
  "account.password_changed",
  "assignment.created",
  "assignment.generated",
  "assignment.failed",
  "assignment.regenerated",
  "assignment.duplicated",
  "assignment.edited",
  "assignment.deleted",
  "evaluation.created",
  "evaluation.completed",
  "evaluation.failed",
  "evaluation.mark_adjusted",
  "evaluation.deleted",
  "slides.generated",
];

const ActivitySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ACTIVITY_TYPES, required: true },
    entity: {
      kind: { type: String, enum: ["assignment", "evaluation", "slides", "account"] },
      id: { type: mongoose.Schema.Types.ObjectId },
      title: { type: String, maxlength: 200 },
    },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ActivitySchema.index({ user: 1, createdAt: -1 });

ActivitySchema.methods.toClient = function toClient() {
  return {
    id: String(this._id),
    type: this.type,
    entity: this.entity?.kind
      ? { kind: this.entity.kind, id: this.entity.id ? String(this.entity.id) : null, title: this.entity.title || "" }
      : null,
    meta: this.meta || {},
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model("Activity", ActivitySchema);
module.exports.ACTIVITY_TYPES = ACTIVITY_TYPES;
