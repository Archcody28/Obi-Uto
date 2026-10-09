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
    // Hidden (moderated) media is excluded from public listings.
    const hidden = { isHidden: { $ne: true } };
    const movies = await Media.find({
      type: "movie",
      status: "published",
      ...hidden,
    }).limit(10);

    const series = await Media.find({
      type: "series",
      status: "published",
      ...hidden,
    }).limit(10);

    const music = await Media.find({
      type: "music",
      status: "published",
      ...hidden,
    }).limit(10);

    const podcasts = await Media.find({
      type: "podcast",
      status: "published",
      ...hidden,
    }).limit(10);

    const totalCreator =
      movies.length + series.length + music.length + podcasts.length;

    // PHASE 26 — external media appears only when creator inventory is empty.
    // Creator media remains first-class; provider failure never crashes Home.
    let external = null;
    if (totalCreator === 0) {
      try {
        const externalMediaService = require("../services/externalMediaService");
        external = await externalMediaService.getExternalHome(8);
      } catch (extErr) {
        external = {
          movies: [], series: [], music: [], podcasts: [],
          unavailable: true,
          provider: "Internet Archive",
        };
      }
    }

    res.json({
      movies,
      series,
      music,
      podcasts,
      external,
    });
  } catch (error) {
    // PHASE 26 — creator DB failure must not crash Home: serve external
    // media as a last resort (still no fake data, no throw).
    try {
      const externalMediaService = require("../services/externalMediaService");
      const external = await externalMediaService.getExternalHome(8);
      return res.json({
        movies: [],
        series: [],
        music: [],
        podcasts: [],
        external,
      });
    } catch (fallbackErr) {
      return res.json({
        movies: [],
        series: [],
        music: [],
        podcasts: [],
        external: {
          movies: [], series: [], music: [], podcasts: [],
          unavailable: true,
          provider: "Internet Archive",
        },
      });
    }
  }
};

// SEARCH MEDIA — PHASE 27 unified: creator + Internet Archive.
// GET /api/media/search?q=... -> { query, results, creatorCount, externalCount, externalUnavailable }
// Backward compatible: `results` is the merged array (creator first).
 const searchMedia = async (req, res) => {
  try {
    let raw = req.query.q;
    if (raw !== undefined && typeof raw !== "string") raw = "";
    raw = typeof raw === "string" ? raw : "";
    const query = raw.trim().slice(0, 100);
    if (!query) {
      return res.status(400).json({ message: "Search query is required", query: "", results: [], creatorCount: 0, externalCount: 0, externalUnavailable: false });
    }

    // Enforce string type and length (prevents operator injection / regex DoS)
    // Escape regex special characters for the creator query.
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Creator search (existing MongoDB capability): published, not hidden.
    // Runs even if the provider is down; provider failure never destroys these.
    let creatorDocs = [];
    try {
      creatorDocs = await Media.find({
        title: { $regex: escaped, $options: "i" },
        status: "published",
        isHidden: { $ne: true },
      }).limit(20).lean();
    } catch (dbErr) {
      creatorDocs = [];
    }

    // External search: ONE provider request via Phase 26 service (cache/
    // timeout/sanitization preserved inside the service). Never throws.
    let externalItems = [];
    let externalUnavailable = false;
    try {
      const externalMediaService = require("../services/externalMediaService");
      const out = await externalMediaService.searchExternal(query, 10);
      externalItems = Array.isArray(out.items) ? out.items : [];
      externalUnavailable = !!out.unavailable;
    } catch (extErr) {
      externalItems = [];
      externalUnavailable = true;
    }

    // Deterministic merge + dedupe: creator first (sorted by title), then
    // external (provider order). Dedupe on normalized id; creator ids win.
    const seen = new Set();
    const results = [];
    const creatorSorted = creatorDocs.slice().sort((a, b) =>
      String(a.title || "").localeCompare(String(b.title || ""))
    );
    for (const doc of creatorSorted) {
      const key = String(doc._id || doc.id || "");
      if (!key || seen.has("c:" + key)) continue;
      seen.add("c:" + key);
      results.push(doc);
    }
    for (const item of externalItems) {
      const key = String(item._id || item.id || "");
      if (!key || seen.has("e:" + key)) continue;
      // Guard: external ids must stay ia:-namespaced; skip anything else.
      if (key.indexOf("ia:") !== 0) continue;
      seen.add("e:" + key);
      results.push(item);
      if (results.length >= 30) break;
    }

    return res.json({
      query,
      results,
      creatorCount: creatorSorted.length,
      externalCount: externalItems.length,
      externalUnavailable,
    });
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
    // PHASE 26 — external items resolve via the provider, never the DB.
    // External ids are stable "ia:<identifier>" strings, so they never
    // collide with Mongo ObjectIds and never touch creator logic
    // (views/revenue/favorites/comments stay creator-only).
    const rawId = req.params.id;
    if (typeof rawId === "string" && rawId.indexOf("ia:") === 0) {
      try {
        const externalMediaService = require("../services/externalMediaService");
        const identifier = externalMediaService.identifierFromId(rawId);
        if (!identifier) {
          return res.status(404).json({ message: "Media not found" });
        }
        const item = await externalMediaService.getExternalItem(identifier);
        if (!item) {
          return res.status(404).json({ message: "Media not found" });
        }
        return res.json(item);
      } catch (extErr) {
        return res.status(502).json({ message: "External provider unavailable" });
      }
    }

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