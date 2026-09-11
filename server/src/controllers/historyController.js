const User = require("../models/User");

// SAVE WATCH PROGRESS
exports.saveProgress = async (req, res) => {
  try {
    const { mediaId, progress } = req.body;

    const user = await User.findById(req.user.id);

    const existing = user.watchHistory.find(
      (h) => h.mediaId === mediaId
    );

    if (existing) {
      existing.progress = progress;
      existing.updatedAt = new Date();
    } else {
      user.watchHistory.push({
        mediaId,
        progress,
        updatedAt: new Date(),
      });
    }

    await user.save();

    res.json({ message: "Progress saved" });
  } catch (err) {
    res.status(500).json({ message: "Error saving progress" });
  }
};