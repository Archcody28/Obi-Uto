const mongoose = require("mongoose");

const watchSchema =
  new mongoose.Schema(
    {
      userId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      mediaId: {
        type:
          mongoose.Schema.Types.ObjectId,
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

      lastPosition: {
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
    "Watch",
    watchSchema
  );