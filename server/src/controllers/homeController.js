const Media = require("../models/Media");
const {
  getTrending,
  getRecommendations,
} = require("../services/recommendationService");

// HOME FEED
exports.getHomeFeed = async (req, res) => {
  try {
    const trending = await getTrending();
    const recommended = await getRecommendations(req.user);

    const latest = await Media.find()
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      trending,
      recommended,
      latest,
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to load home feed",
    });
  }
};