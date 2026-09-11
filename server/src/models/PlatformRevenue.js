const mongoose =
  require("mongoose");

const schema =
  new mongoose.Schema(
    {
      source: String,

      amount: Number,
    },
    {
      timestamps: true,
    }
  );

module.exports =
  mongoose.model(
    "PlatformRevenue",
    schema
  );