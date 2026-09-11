const mongoose =
  require("mongoose");

const followSchema =
  new mongoose.Schema(
    {
      userId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      creatorId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Creator",
        required: true,
      },
    },
    {
      timestamps: true,
    }
  );

module.exports =
  mongoose.model(
    "Follow",
    followSchema
  );