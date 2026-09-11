const Favorite =
  require(
    "../models/Favorite"
  );

const {
  updateScore,
} = require(
  "../services/recommendationEngine"
);

const addFavorite =
  async (req, res) => {
    try {
      const favorite =
        await Favorite.create({
          user:
            req.user.id,
          media:
            req.body.mediaId,
        });

      res.status(201).json(
        favorite
      );

      // Update recommendation score after favoriting
      try {
        await updateScore(
          req.user.id,
          req.body.mediaId,
          8
        );
      } catch (scoreErr) {
        console.log("favorite score error:", scoreErr.message);
      }
    } catch (err) {
      res.status(500).json({
        error:
          err.message,
      });
    }
  };

const getFavorites =
  async (req, res) => {
    try {
      const favorites =
        await Favorite.find({
          user:
            req.user.id,
        }).populate("media");

      res.json(favorites);
    } catch (err) {
      res.status(500).json({
        error:
          err.message,
      });
    }
  };

module.exports = {
  addFavorite,
  getFavorites,
};