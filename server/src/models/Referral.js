const mongoose =
  require("mongoose");

const schema =
  new mongoose.Schema(
    {
      referrerId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      referredUserId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
      },

      rewardCoins: {
        type: Number,
        default: 100,
      },
    },
    {
      timestamps: true,
    }
  );

module.exports =
  mongoose.model(
    "Referral",
    schema
  );