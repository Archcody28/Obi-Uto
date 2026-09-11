const mongoose =
  require("mongoose");

const schema =
  new mongoose.Schema(
    {
      userId: {
        type:
          mongoose.Schema.Types.ObjectId,
      },

      creatorId: {
        type:
          mongoose.Schema.Types.ObjectId,
      },

      amount: Number,

      status: {
        type: String,
        default:
          "active",
      },
    },
    {
      timestamps: true,
    }
  );

module.exports =
  mongoose.model(
    "CreatorSubscription",
    schema
  );