const mongoose =
  require("mongoose");

const withdrawalSchema =
  new mongoose.Schema(
    {
      creatorId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Creator",
      },

      amount: Number,

      status: {
        type: String,
        enum: [
          "pending",
          "approved",
          "rejected",
          "paid",
        ],
        default:
          "pending",
      },
    },
    {
      timestamps: true,
    }
  );

module.exports =
  mongoose.model(
    "Withdrawal",
    withdrawalSchema
  );