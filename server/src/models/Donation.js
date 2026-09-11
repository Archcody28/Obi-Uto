const mongoose =
  require("mongoose");

const schema =
  new mongoose.Schema(
    {
      streamId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "LiveStream",
        required: true,
      },

      donorId: {
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

      amount: {
        type: Number,
        required: true,
      },

      message: {
        type: String,
        default: "",
      },

      platformFee: {
        type: Number,
        default: 0,
      },

      creatorAmount: {
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
    "Donation",
    schema
  );