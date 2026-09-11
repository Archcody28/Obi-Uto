const mongoose =
  require("mongoose");

const liveStreamSchema =
  new mongoose.Schema(
    {
      creatorId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Creator",
        required: true,
      },

      title: {
        type: String,
        required: true,
      },

      description: {
        type: String,
        default: "",
      },

      thumbnail: {
        type: String,
        default: "",
      },

      category: {
        type: String,
        default: "General",
      },

      streamKey: {
        type: String,
        unique: true,
      },

      playbackUrl: String,

      scheduledFor: Date,

      startedAt: Date,

      endedAt: Date,

      isScheduled: {
        type: Boolean,
        default: false,
      },

      isLive: {
        type: Boolean,
        default: false,
      },

      viewers: {
        type: Number,
        default: 0,
      },

      notifyUsers: [
        {
          type:
            mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
    },
    {
      timestamps: true,
    }
  );

module.exports =
  mongoose.model(
    "LiveStream",
    liveStreamSchema
  );