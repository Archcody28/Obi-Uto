const mongoose =
  require("mongoose");

const schema =
  new mongoose.Schema(
    {
      name: {
        type: String,
        required: true,
      },

      icon: {
        type: String,
        required: true,
      },

      coinCost: {
        type: Number,
        required: true,
      },

      creatorValue: {
        type: Number,
        required: true,
      },

      active: {
        type: Boolean,
        default: true,
      },
    },
    {
      timestamps: true,
    }
  );

module.exports =
  mongoose.model(
    "Gift",
    schema
  );