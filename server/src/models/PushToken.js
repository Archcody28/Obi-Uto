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
        unique: true,
      },

      token: {
        type: String,
        required: true,
      },

      platform: {
        type: String,
        enum: [
          "android",
          "ios",
        ],
      },
    },
    {
      timestamps: true,
    }
  );

module.exports =
  mongoose.model(
    "PushToken",
    schema
  );