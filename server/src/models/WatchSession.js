const mongoose =
  require("mongoose");

const schema =
  new mongoose.Schema(
    {
      userId: {
        type:
          mongoose.Schema.Types.ObjectId,
      },

      mediaId: {
        type:
          mongoose.Schema.Types.ObjectId,
      },

      currentTime: Number,

      duration: Number,

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
    "WatchSession",
    schema
  );