const mongoose =
  require("mongoose");

const creatorSchema =
  new mongoose.Schema(
    {
      userId: {
        type:
          mongoose.Schema.Types
            .ObjectId,
        ref: "User",
        required: true,
      },

      displayName: {
        type: String,
        required: true,
      },

      bio: {
        type: String,
        default: "",
      },

      avatar: {
        type: String,
        default: "",
      },

      followers: {
        type: Number,
        default: 0,
      },

      totalViews: {
        type: Number,
        default: 0,
      },

      totalEarnings: {
        type: Number,
        default: 0,
      },

      verified: {
        type: Boolean,
        default: false,
      },
    },
    {
      timestamps: true,
    }
  );

module.exports =
  mongoose.model(
    "Creator",
    creatorSchema
  );