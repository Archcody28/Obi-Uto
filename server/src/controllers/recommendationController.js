const Media =
  require("../models/Media");

const StreamingAnalytics =
  require(
    "../models/StreamingAnalytics"
  );

const WatchSession =
  require(
    "../models/WatchSession"
  );

const Favorite =
  require(
    "../models/Favorite"
  );

/*
 TRENDING
*/
exports.getTrending =
  async (req, res) => {
    try {
      const analytics =
        await StreamingAnalytics
          .find()
          .sort({
            views: -1,
          })
          .limit(20);

      const ids =
        analytics.map(
          (item) =>
            item.mediaId
        );

      const media =
        await Media.find({
          _id: {
            $in: ids,
          },
        });

      res.json(media);
    } catch (err) {
      res.status(500).json({
        message:
          err.message,
      });
    }
  };

/*
 SIMILAR MEDIA
*/
exports.getSimilar =
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
          _id: {
            $ne:
              media._id,
          },

          genre: {
            $in:
              media.genre,
          },
        }).limit(12);

      res.json(similar);
    } catch (err) {
      res.status(500).json({
        message:
          err.message,
      });
    }
  };

/*
 PERSONALIZED
*/
exports.getRecommended =
  async (req, res) => {
    try {
      const userId =
        req.user.id;

      /*
       Watch history
      */
      const watched =
        await WatchSession.find({
          userId,
        }).populate(
          "mediaId"
        );

      /*
       Favorites
      */
      const favorites =
        await Favorite.find({
          userId,
        }).populate(
          "mediaId"
        );

      /*
       Genre scores
      */
      const genreScores =
        {};

      watched.forEach(
        (item) => {
          item.mediaId
            ?.genre
            ?.forEach(
              (genre) => {
                genreScores[
                  genre
                ] =
                  (
                    genreScores[
                      genre
                    ] || 0
                  ) + 5;
              }
            );
        }
      );

      favorites.forEach(
        (item) => {
          item.mediaId
            ?.genre
            ?.forEach(
              (genre) => {
                genreScores[
                  genre
                ] =
                  (
                    genreScores[
                      genre
                    ] || 0
                  ) + 4;
              }
            );
        }
      );

      /*
       Top genres
      */
      const topGenres =
        Object.entries(
          genreScores
        )
          .sort(
            (a, b) =>
              b[1] - a[1]
          )
          .slice(0, 3)
          .map(
            ([genre]) =>
              genre
          );

      /*
       Fallback:
       If user has no watch
       history or favorites,
       return trending content
      */
      if (
        topGenres.length ===
        0
      ) {
        const fallback =
          await Media.find()
            .sort({
              views: -1,
            })
            .limit(20);

        return res.json(
          fallback
        );
      }

      /*
       Recommend media
      */
      const recommendations =
        await Media.find({
          genre: {
            $in:
              topGenres,
          },
        })
          .sort({
            views: -1,
          })
          .limit(20);

      res.json(
        recommendations
      );
    } catch (err) {
      console.log(err);

      res.status(500).json({
        message:
          "Failed to generate recommendations",
      });
    }
  };
module.exports = {
  getTrending:
    exports.getTrending,

  getSimilar:
    exports.getSimilar,

  getRecommended:
    exports.getRecommended,
};