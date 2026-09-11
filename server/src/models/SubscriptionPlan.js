const mongoose =
  require("mongoose");

const schema =
  new mongoose.Schema(
    {
      name: {
        type: String,
        required: true,
      },

      code: {
        type: String,
        unique: true,
      },

      description: String,

      price: Number,

      durationDays: {
        type: Number,
        default: 30,
      },

      features: [String],

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
    "SubscriptionPlan",
    schema
  );