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
      },

      mediaId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Media",
        required: true,
      },

      parentComment: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Comment",
        default: null,
      },

      text: {
        type: String,
        required: true,
      },
    },
    {
      timestamps: true,
    }
  );

module.exports =
  mongoose.model(
    "Comment",
    schema
  );