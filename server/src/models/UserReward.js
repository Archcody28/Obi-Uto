const mongoose =
  require("mongoose");

const schema =
  new mongoose.Schema(
    {
      userId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
      },

      streakDays: {
        type: Number,
        default: 0,
      },

      lastClaimedAt: Date,

      totalRewardsEarned: {
        type: Number,
        default: 0,
      },

      level: {
        type: Number,
        default: 1,
      },

      experience: {
        type: Number,
        default: 0,
      },

      badges: [
        String,
      ],
    },
    {
      timestamps: true,
    }
  );

module.exports =
  mongoose.model(
    "UserReward",
    schema
  );