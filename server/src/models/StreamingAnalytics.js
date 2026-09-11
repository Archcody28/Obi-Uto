const mongoose =
  require("mongoose");

const schema =
  new mongoose.Schema(
    {
      mediaId:
        mongoose.Schema.Types.ObjectId,

      views: {
        type: Number,
        default: 0,
      },

      watchTime: {
        type: Number,
        default: 0,
      },

      bandwidth: {
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
    "StreamingAnalytics",
    schema
  );