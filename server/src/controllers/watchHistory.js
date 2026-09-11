const WatchHistory =
  require(
    "../models/WatchHistory"
  );

const saveProgress =
  async (req, res) => {
    try {
      const {
        mediaId,
        progress,
      } = req.body;

      const history =
        await WatchHistory.findOneAndUpdate(
          {
            user:
              req.user.id,
            media:
              mediaId,
          },
          {
            progress,
          },
          {
            upsert: true,
            new: true,
          }
        );

      res.json(history);
    } catch (err) {
      res.status(500).json({
        error:
          err.message,
      });
    }
  };

const getContinueWatching =
  async (req, res) => {
    try {
      const history =
        await WatchHistory.find({
          user:
            req.user.id,
        })
          .populate("media")
          .sort({
            updatedAt: -1,
          });

      res.json(history);
    } catch (err) {
      res.status(500).json({
        error:
          err.message,
      });
    }
  };

module.exports = {
  saveProgress,
  getContinueWatching,
};