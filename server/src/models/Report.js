const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // What is being reported. Stored explicitly so a report always
    // identifies its target reliably.
    targetType: {
      type: String,
      enum: ["media", "user", "creator", "live"],
      required: true,
    },

    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    details: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },

    status: {
      type: String,
      enum: ["open", "reviewing", "resolved", "dismissed"],
      default: "open",
    },

    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    resolvedAt: {
      type: Date,
      default: null,
    },

    actionTaken: {
      type: String,
      default: "",
      trim: true,
      maxlength: 200,
    },
  },
  { timestamps: true }
);

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ targetType: 1, targetId: 1 });

module.exports =
  mongoose.models.Report || mongoose.model("Report", reportSchema);
