const mongoose =
  require("mongoose");

const schema =
  new mongoose.Schema(
    {
      streamId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "LiveStream",
      },

      senderId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
      },

      creatorId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Creator",
      },

      giftId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Gift",
      },

      quantity: {
        type: Number,
        default: 1,
      },

      totalCoins: Number,

      creatorEarning:
        Number,

      platformFee:
        Number,
    },
    {
      timestamps: true,
    }
  );

module.exports =
  mongoose.model(
    "GiftTransaction",
    schema
  );