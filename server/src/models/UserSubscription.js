const mongoose =
  require("mongoose");

const schema =
  new mongoose.Schema(
    {
      userId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
      },

      planId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref:
          "SubscriptionPlan",
      },

      startDate: Date,

      endDate: Date,

      status: {
        type: String,
        enum: [
          "active",
          "expired",
          "cancelled",
        ],
        default: "active",
      },
    },
    {
      timestamps: true,
    }
  );

module.exports =
  mongoose.model(
    "UserSubscription",
    schema
  );