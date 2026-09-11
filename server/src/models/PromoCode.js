const mongoose =
  require("mongoose");

const schema =
  new mongoose.Schema(
    {
      code: {
        type: String,
        unique: true,
        uppercase: true,
      },

      rewardCoins: {
        type: Number,
        required: true,
      },

      maxUses: {
        type: Number,
        default: 1,
      },

      uses: {
        type: Number,
        default: 0,
      },

      expiresAt: Date,

      active: {
        type: Boolean,
        default: true,
      },
    },
    {
      timestamps: true,
    }
  );

module.exports =
  mongoose.model(
    "PromoCode",
    schema
  );