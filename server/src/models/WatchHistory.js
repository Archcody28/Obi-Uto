const mongoose =
  require("mongoose");

const watchHistorySchema =
  new mongoose.Schema(
    {
      user: {
        type:
          mongoose.Schema.Types
            .ObjectId,
        ref: "User",
        required: true,
      },

      media: {
        type:
          mongoose.Schema.Types
            .ObjectId,
        ref: "Media",
        required: true,
      },

      progress: {
        type: Number,
        default: 0,
      },

      completed: {
        type: Boolean,
        default: false,
      },
    },
    {
      timestamps: true,
    }
  );

module.exports =
  mongoose.model(
    "WatchHistory",
    watchHistorySchema
  );