const mongoose =
  require("mongoose");

const schema =
  new mongoose.Schema(
    {
      streamId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Media",
        required: true,
      },

      userId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
      },

      username: {
        type: String,
        required: true,
      },

      message: {
        type: String,
        required: true,
      },

      pinned: {
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
    "LiveChat",
    schema
  );