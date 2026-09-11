const mongoose =
  require("mongoose");

const transactionSchema =
  new mongoose.Schema(
    {
      creatorId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Creator",
      },

      amount: Number,

      type: {
        type: String,
        enum: [
          "earning",
          "withdrawal",
          "bonus",
          "refund",
        ],
      },

      description:
        String,
    },
    {
      timestamps: true,
    }
  );

module.exports =
  mongoose.model(
    "Transaction",
    transactionSchema
  );