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
      const existing =
        await Favorite.findOne({
          user: req.user.id,
          media: req.body.mediaId,
        });

      if (existing) {
        return res.status(200).json(existing);
      }

      const favorite =
        await Favorite.create({
          user: req.user.id,
          media: req.body.mediaId,
        });

      res.status(201).json(favorite);

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

const removeFavorite = async (req, res) => {
  try {
    const result = await Favorite.findOneAndDelete({
      user: req.user.id,
      media: req.params.mediaId,
    });

    if (!result) {
      return res.status(404).json({ message: "Favorite not found" });
    }

    res.json({ message: "Favorite removed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  addFavorite,
  getFavorites,
  removeFavorite,
};