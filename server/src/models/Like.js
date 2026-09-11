const mongoose = require("mongoose");

const likeSchema =
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
    },
    {
      timestamps: true,
    }
  );

likeSchema.index(
  {
    userId: 1,
    mediaId: 1,
  },
  {
    unique: true,
  }
);

module.exports =
  mongoose.model(
    "Like",
    likeSchema
  );