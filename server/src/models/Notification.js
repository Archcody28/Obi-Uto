const mongoose =
  require("mongoose");

const notificationSchema =
  new mongoose.Schema(
    {
      userId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      title: {
        type: String,
        required: true,
      },

      message: {
        type: String,
        required: true,
      },

      type: {
        type: String,
        enum: [
          "live",
          "upload",
          "donation",
          "subscription",
          "payment",
          "download",
          "system",
          "follow",
          "comment",
        ],
        default: "system",
      },

      data: {
        type: Object,
        default: {},
      },

      read: {
        type: Boolean,
        default: false,
      },

      sent: {
        type: Boolean,
        default: false,
      },

      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
    {
      timestamps: true,
    }
  );

module.exports =
  mongoose.model(
    "Notification",
    notificationSchema
  );