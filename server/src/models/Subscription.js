const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    planName: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: ["base", "addon", "bundle"],
      required: true,
    },

    price: {
      type: Number,
      required: true,
    },

    features: {
      type: [String], // e.g. ["4k", "offline", "no_ads"]
      default: [],
    },

    status: {
      type: String,
      enum: ["active", "expired", "cancelled"],
      default: "active",
    },

    startDate: {
      type: Date,
      default: Date.now,
    },

    endDate: {
      type: Date,
    },

    autoRenew: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subscription", subscriptionSchema);