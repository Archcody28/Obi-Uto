const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
    },

    avatar: {
      type: String,
      default: "",
    },

    subscription: {
      type: String,
      enum: ["free", "premium"],
      default: "free",
    },
    

    watchHistory: [
      {
        mediaId: String,
        progress: Number,
        updatedAt: Date,
      },
    ],

    subscriptions: [
  {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subscription",
  },
 ],

    role: {
      type: String,
      enum: ["user", "admin"],
  default: "user",
},

    // Minimal moderation state. Suspended users keep their document
    // (no destructive deletes); authMiddleware rejects them with 403.
    isSuspended: {
      type: Boolean,
      default: false,
    },

    suspensionReason: {
      type: String,
      default: "",
    },

    suspendedAt: {
      type: Date,
      default: null,
    },

    suspendedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

referralCode: {
  type: String,
  unique: true,
  sparse: true,
},

expoPushToken: {
  type: String,
  default: "",
},

profiles: [
  {
    name: String,

    avatar: String,

    isKids: {
      type: Boolean,
      default: false,
    },

    pin: {
      type: String,
      default: "",
    },

    maxRating: {
      type: String,
      default: "18+",
    },
  },
],
  },

  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);