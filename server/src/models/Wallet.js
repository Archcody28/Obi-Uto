const mongoose =
  require("mongoose");

const walletSchema =
  new mongoose.Schema(
    {
      creatorId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Creator",
        required: true,
        unique: true,
      },

      balance: {
        type: Number,
        default: 0,
      },

      pendingBalance: {
        type: Number,
        default: 0,
      },

      totalEarned: {
        type: Number,
        default: 0,
      },

      totalWithdrawn: {
        type: Number,
        default: 0,
      },
    },
    {
      timestamps: true,
    }
  );

module.exports =
  mongoose.model(
    "Wallet",
    walletSchema
  );