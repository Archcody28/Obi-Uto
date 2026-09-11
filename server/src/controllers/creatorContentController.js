const Media =
  require("../models/Media");

const getCreatorContent =
  async (req, res) => {
    try {
      const media =
        await Media.find({
          creator:
            req.params.creatorId,
        }).sort({
          createdAt: -1,
        });

      res.json(media);
    } catch (err) {
      res.status(500).json({
        error:
          err.message,
      });
    }
  };

module.exports = {
  getCreatorContent,
};