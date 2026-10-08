const WatchSession = require("../models/WatchSession");
const Media =
  require("../models/Media");

const User =
  require("../models/User");

const {
  updateScore,
} = require(
  "../services/recommendationEngine"
);

exports.saveProgress =
  async (req, res) => {
    const {
      mediaId,
      currentTime,
      duration,
    } = req.body;

    if (!mediaId) {
      return res.status(400).json({
        message: "mediaId is required",
      });
    }

    const safeCurrent = Number(currentTime) || 0;
    const safeDuration = Number(duration) || 0;
    const completed =
      safeDuration > 0 && safeCurrent >= safeDuration * 0.95;

    const watch =
      await WatchSession.findOneAndUpdate(
        {
          userId:
            req.user.id,

          mediaId,
        },
        {
          currentTime: safeCurrent,
          duration: safeDuration,
          completed,
        },
        {
          upsert: true,
          new: true,
        }
      );

    res.json(watch);

    // Update recommendation score based on watch progress
    const percent =
      duration
        ? currentTime / duration
        : 0;

    try {
      if (percent >= 0.9) {
        await updateScore(
          req.user.id,
          mediaId,
          10
        );
      } else if (percent >= 0.5) {
        await updateScore(
          req.user.id,
          mediaId,
          5
        );
      } else if (percent >= 0.25) {
        await updateScore(
          req.user.id,
          mediaId,
          3
        );
      }
    } catch (err) {
      console.log("score update error:", err.message);
    }
  };

exports.getProgress =
  async (req, res) => {
    const watch =
      await WatchSession.findOne(
        {
          userId:
            req.user.id,

          mediaId:
            req.params.mediaId,
        }
      );

    res.json(watch);
  };

  exports.continueWatching =
  async (req, res) => {
    const items =
      await WatchSession
        .find({
          userId: req.user.id,
          $or: [{ completed: false }, { completed: { $exists: false } }],
        })
        .sort({
          updatedAt: -1,
        })
        .limit(20)
        .populate("mediaId");

    // Drop entries whose media was deleted and cap duplicates per title.
    const seen = new Set();
    const clean = items.filter((entry) => {
      const media = entry.mediaId && entry.mediaId._id ? entry.mediaId : null;
      if (!media) return false;
      const key = String(media._id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    res.json(clean);
  };

  exports.authorizeDownload =
  async (req, res) => {
    try {
      const media =
        await Media.findById(
          req.params.mediaId
        );

      if (!media) {
        return res.status(404).json({
          message:
            "Media not found",
        });
      }

      const user =
        await User.findById(
          req.user.id
        );

      if (!user) {
        return res.status(404).json({
          message:
            "User not found",
        });
      }

      /*
       Premium downloads
      */

      if (
        media.isPremium &&
        user.subscription !==
          "premium"
      ) {
        return res.status(403).json({
          message:
            "Upgrade to Premium to download this content",
        });
      }

      return res.json({
        allowed: true,
        message:
          "Download authorized",
      });
    } catch (err) {
      return res.status(500).json({
        message:
          "Download authorization failed",
      });
    }
  };