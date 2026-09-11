const mongoose =
  require("mongoose");

const creatorEarningSchema =
  new mongoose.Schema(
    {
      creatorId: {
        type:
          mongoose.Schema.Types
            .ObjectId,
        ref: "Creator",
      },

      mediaId: {
        type:
          mongoose.Schema.Types
            .ObjectId,
        ref: "Media",
      },

      streams: {
        type: Number,
        default: 0,
      },

      revenue: {
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
    "CreatorEarning",
    creatorEarningSchema
  );