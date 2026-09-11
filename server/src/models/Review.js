const mongoose =
  require("mongoose");

const reviewSchema =
  new mongoose.Schema(
    {
      mediaId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Media",
        required: true,
      },

      userId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      rating: {
        type: Number,
        min: 1,
        max: 5,
        required: true,
      },

      review: {
        type: String,
      },
    },
    {
      timestamps: true,
    }
  );

module.exports =
  mongoose.model(
    "Review",
    reviewSchema
  );