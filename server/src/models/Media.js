const mongoose = require("mongoose");

const {
  buildDownloadUrl,
} = require("../utils/mediaDownload");

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

    // Explicit downloadable single-file representation (e.g. MP4) for
    // offline saves. Null/absent means the title genuinely has no
    // downloadable file (e.g. streaming-only HLS media).
    downloadUrl: {
      type: String,
      default: null,
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

    // Minimal moderation state. Hidden media stays in the database and
    // is excluded from public listings; admins can restore it.
    isHidden: {
      type: Boolean,
      default: false,
    },

    hiddenBy: {
      type:
        mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    hiddenAt: {
      type: Date,
      default: null,
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

// Expose the downloadable representation through every media API response.
// Legacy documents (created before `downloadUrl` existed, e.g. seeded or
// admin-created rows) get the value computed on serialization so clients
// always see an explicit `downloadUrl` field: a real file URL or null when
// the media is streaming-only.
mediaSchema.set("toJSON", {
  virtuals: false,
  transform: function (doc, ret) {
    if (ret.downloadUrl === undefined || ret.downloadUrl === null || ret.downloadUrl === "") {
      ret.downloadUrl = buildDownloadUrl(ret) || null;
    }
    return ret;
  },
});

module.exports = mongoose.model("Media", mediaSchema);