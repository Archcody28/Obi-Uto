const mongoose =
  require("mongoose");

const analyticsSchema =
  new mongoose.Schema(
    {
      creatorId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Creator",
        required: true,
      },

      totalViews: {
        type: Number,
        default: 0,
      },

      totalLikes: {
        type: Number,
        default: 0,
      },

      totalComments: {
        type: Number,
        default: 0,
      },

      totalFollowers: {
        type: Number,
        default: 0,
      },

      totalDownloads: {
        type: Number,
        default: 0,
      },

      watchTimeMinutes: {
        type: Number,
        default: 0,
      },

      estimatedRevenue: {
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
    "Analytics",
    analyticsSchema
  );