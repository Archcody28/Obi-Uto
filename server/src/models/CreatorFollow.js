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
    },
    {
      timestamps: true,
    }
  );

module.exports =
  mongoose.model(
    "CreatorFollow",
    schema
  );