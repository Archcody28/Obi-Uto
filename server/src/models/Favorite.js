const mongoose =
  require("mongoose");

const favoriteSchema =
  new mongoose.Schema(
    {
      user: {
        type:
          mongoose.Schema.Types
            .ObjectId,
        ref: "User",
        required: true,
      },

      media: {
        type:
          mongoose.Schema.Types
            .ObjectId,
        ref: "Media",
        required: true,
      },
    },
    {
      timestamps: true,
    }
  );

// Prevent duplicate favorites for the same user+media pair
favoriteSchema.index(
  { user: 1, media: 1 },
  { unique: true }
);

module.exports =
  mongoose.model(
    "Favorite",
    favoriteSchema
  );