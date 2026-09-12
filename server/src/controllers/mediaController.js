const Media = require("../models/Media.js");

/* ===================================================
   USER FEATURES
   Used by Home Screen and Search Screen
=================================================== */

// GET HOME MEDIA
const {
  addStreamRevenue,
} = require(
  "../services/earningService"
);

 const getHomeMedia = async (req, res) => {
  try {
    const movies = await Media.find({
      type: "movie",
      status: "published",
    }).limit(10);

    const series = await Media.find({
      type: "series",
      status: "published",
    }).limit(10);

    const music = await Media.find({
      type: "music",
      status: "published",
    }).limit(10);

    const podcasts = await Media.find({
      type: "podcast",
      status: "published",
    }).limit(10);

    res.json({
      movies,
      series,
      music,
      podcasts,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

// SEARCH MEDIA
 const searchMedia = async (req, res) => {
  try {
    let q = req.query.q || "";

    // Enforce string type and length (prevents operator injection / regex DoS)
    if (typeof q !== "string") {
      q = "";
    }
    q = q.trim().slice(0, 100);
    // Escape regex special characters
    q = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const results = await Media.find({
      title: {
        $regex: q,
        $options: "i",
      },
    }).limit(50);

    res.json(results);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

/* ===================================================
   ADMIN FEATURES
   Used by Admin Dashboard
=================================================== */

// CREATE MEDIA
 const createMedia = async (req, res) => {
  try {
    const media = await Media.create(req.body);

    return res.status(201).json({
      message: "Media created successfully",
      media,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to create media",
      error: err.message,
    });
  }
};

// GET ALL MEDIA
 const getAllMedia = async (req, res) => {
  try {
    const media = await Media.find().sort({
      createdAt: -1,
    });

    return res.json(media);
  } catch (err) {
    return res.status(500).json({
      message: "Failed to fetch media",
    });
  }
};

// GET SINGLE MEDIA
 const getMediaById = async (req, res) => {
  try {
    const media =
  await Media.findById(
    req.params.id
  );

if (!media) {
  return res.status(404).json({
    message: "Media not found",
  });
}

if (
  media.isPremium
) {
  if (!req.user) {
    return res.status(401).json({
      message:
        "Login required",
    });
  }

  const User =
    require("../models/User");

  const user =
    await User.findById(
      req.user.id
    );

  if (
    user.subscription !==
    "premium"
  ) {
    return res.status(403).json({
      message:
        "Upgrade to Premium to watch this content",
    });
  }
}

    // increase views
    media.views += 1;
    const StreamingAnalytics =
  require(
    "../models/StreamingAnalytics"
  );

await StreamingAnalytics
  .findOneAndUpdate(
    {
      mediaId:
        media._id,
    },
    {
      $inc: {
        views: 1,
      },
    },
    {
      upsert: true,
    }
  );

await media.save();
if (
  media.creatorId
) {
  await addStreamRevenue(
    media.creatorId,
    media._id
  );
}

const {
  creditCreator,
} = require(
  "../services/revenueService"
);

if (media.creator) {
  await creditCreator(
    media.creator,
    0.05,
    "Media View Revenue"
  );
}

    return res.json(media);
  }
  catch (err) {
  console.error(
    "GET MEDIA ERROR:",
    err
  );

  res.status(500).json({
    message: "Failed to fetch media",
  });
}
};

// DELETE MEDIA
const deleteMedia = async (req, res) => {
  try {
    await Media.findByIdAndDelete(
      req.params.id
    );

    return res.json({
      message:
        "Media deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      message:
        "Error deleting media",
    });
  }
};

const getSeriesEpisodes =
  async (req, res) => {
    try {
      const episodes =
        await Media.find({
          "seriesInfo.seriesId":
            req.params.id,
        }).sort({
          "seriesInfo.seasonNumber":
            1,

          "seriesInfo.episodeNumber":
            1,
        });

      res.json(
        episodes
      );
    } catch (err) {
      res.status(500).json({
        message:
          "Failed to fetch episodes",
      });
    }
  };

module.exports = {
  getHomeMedia,
  searchMedia,
  createMedia,
  getSeriesEpisodes,
  getAllMedia,
  getMediaById,
  deleteMedia,
};