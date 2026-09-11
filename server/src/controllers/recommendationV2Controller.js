const Media =
  require("../models/Media");

const {
  buildUserProfile,
} = require(
  "../services/recommendationEngine"
);

exports.getForYou =
  async (req, res) => {
    try {
      const profile =
        await buildUserProfile(
          req.user.id
        );

      const genres =
        Object.keys(
          profile
        );

      const media =
        await Media.find({
          genres: {
            $in:
              genres,
          },
        })
          .sort({
            trendingScore:
              -1,
          })
          .limit(20);

      res.json(media);
    } catch (err) {
      res.status(500).json({
        error:
          err.message,
      });
    }
  };
  exports.similarContent =
  async (req, res) => {
    try {
      const media =
        await Media.findById(
          req.params.id
        );

      if (!media) {
        return res
          .status(404)
          .json({
            message:
              "Media not found",
          });
      }

      const similar =
        await Media.find({
          genres: {
            $in:
              media.genres,
          },

          _id: {
            $ne:
              media._id,
          },
        })
          .limit(12);

      res.json(
        similar
      );
    } catch (err) {
      res.status(500).json({
        error:
          err.message,
      });
    }
  };