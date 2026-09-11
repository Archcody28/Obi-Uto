const mongoose = require("mongoose");

const mediaSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      default: "",
    },
    creatorId: {
  type:
    mongoose.Schema.Types.ObjectId,
  ref: "Creator",
},

status: {
  type: String,
  enum: [
    "draft",
    "pending",
    "published",
    "rejected",
  ],
  default: "pending",
},

uploadedBy: {
  type:
    mongoose.Schema.Types.ObjectId,
  ref: "User",
},

    type: {
      type: String,
      enum: ["movie", "series", "music", "song", "podcast"],
      required: true,
    },

    genre: {
      type: [String],
      default: [],
    },

tags: [
  {
    type: String,
  },
],
    language: {
      type: String,
      default: "English",
    },

    releaseYear: {
      type: Number,
    },

    duration: {
      type: Number, // in seconds
    },

    thumbnail: {
      type: String,
    },

    banner: {
      type: String,
    },

    videoUrl: {
      type: String, // HLS or MP4
    },

    audioUrl: {
      type: String,
    },

    trailerUrl: {
      type: String,
    },

    views: {
      type: Number,
      default: 0,
    },

    rating: {
      type: Number,
      default: 0,
    },

    maturityRating: {
  type: String,
  enum: [
    "G",
    "PG",
    "PG-13",
    "16+",
    "18+",
  ],
  default: "G",
},

    isPremium: {
      type: Boolean,
      default: false,
    },

    seriesInfo: {
  seasonNumber: {
    type: Number,
  },

  episodeNumber: {
    type: Number,
  },

  episodeTitle: {
    type: String,
  },

  seriesId: {
    type:
      mongoose.Schema.Types.ObjectId,

    ref: "Media",
  },
},

    followers: {
  type: Number,
  default: 0,
},

likes: {
  type: Number,
  default: 0,
},

comments: {
  type: Number,
  default: 0,
},


streaming: {
  hlsUrl: String,

  qualities: [
    {
      label: String,
      url: String,
    },
  ],
},
favorites: {
  type: Number,
  default: 0,
},

trendingScore: {
  type: Number,
  default: 0,
},
  },
  { timestamps: true }
);

module.exports = mongoose.model("Media", mediaSchema);