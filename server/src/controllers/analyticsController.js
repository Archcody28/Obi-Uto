const Media = require("../models/Media");
const User = require("../models/User");
const Subscription = require("../models/Subscription");
const Follow = require("../models/Follow");

// ======================
// PLATFORM ANALYTICS
// ======================
const getAnalytics = async (req, res) => {
  try {
    const totalUsers =
      await User.countDocuments();

    const totalMedia =
      await Media.countDocuments();

    const topMedia =
      await Media.find()
        .sort({ views: -1 })
        .limit(5);

    const totalViews =
      await Media.aggregate([
        {
          $group: {
            _id: null,
            total: {
              $sum: "$views",
            },
          },
        },
      ]);

    return res.json({
      totalUsers,
      totalMedia,
      totalViews:
        totalViews[0]?.total || 0,
      topMedia,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Analytics error",
      error: err.message,
    });
  }
};

// ======================
// PLATFORM REVENUE
// ======================
const getRevenue = async (
  req,
  res
) => {
  try {
    const subs =
      await Subscription.find({
        status: "active",
      });

    const revenue =
      subs.reduce(
        (acc, sub) =>
          acc + sub.price,
        0
      );

    return res.json({
      activeSubscriptions:
        subs.length,
      estimatedMonthlyRevenue:
        revenue,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Revenue error",
      error: err.message,
    });
  }
};

// ======================
// CREATOR ANALYTICS
// ======================
const getCreatorAnalytics =
  async (req, res) => {
    try {
      const creatorId =
        req.params.creatorId;

      const media =
        await Media.find({
          creator: creatorId,
        });

      const totalViews =
        media.reduce(
          (acc, item) =>
            acc + (item.views || 0),
          0
        );

      const totalLikes =
        media.reduce(
          (acc, item) =>
            acc + (item.likes || 0),
          0
        );

      const totalComments =
        media.reduce(
          (acc, item) =>
            acc +
            (item.comments || 0),
          0
        );

      const followers =
        await Follow.countDocuments(
          {
            creatorId,
          }
        );

      const estimatedRevenue =
        (
          totalViews * 0.002
        ).toFixed(2);

      return res.json({
        totalViews,
        totalLikes,
        totalComments,
        followers,
        estimatedRevenue,
      });
    } catch (err) {
      return res.status(500).json({
        error: err.message,
      });
    }
  };

// ======================
// EXPORTS
// ======================
module.exports = {
  getAnalytics,
  getRevenue,
  getCreatorAnalytics,
};