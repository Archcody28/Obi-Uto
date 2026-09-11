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
      },

      mediaId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Media",
        required: true,
      },

      score: {
        type: Number,
        default: 0,
      },
    },
    {
      timestamps: true,
    }
  );

schema.index({
  userId: 1,
  mediaId: 1,
}, {
  unique: true,
});

module.exports =
  mongoose.model(
    "RecommendationScore",
    schema
  );