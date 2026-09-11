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

      subscriptionId: {
        type:
          mongoose.Schema.Types.ObjectId,
      },

      amount: Number,

      reference: {
        type: String,
        unique: true,
      },

      status: {
        type: String,
        enum: [
          "pending",
          "success",
          "failed",
        ],
        default: "pending",
      },

      gateway: {
        type: String,
        default:
          "paystack",
      },

      paymentType: {
        type: String,
        enum: [
          "subscription",
          "coins",
        ],
        default:
          "subscription",
      },

      coinsPurchased: {
        type: Number,
        default: 0,
      },

      metadata: {
        type: Object,
        default: {},
      },
    },
    {
      timestamps: true,
    }
  );

module.exports =
  mongoose.model(
    "Payment",
    schema
  );