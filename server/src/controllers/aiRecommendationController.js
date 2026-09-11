const RecommendationScore =
  require(
    "../models/RecommendationScore"
  );

exports.getForYou =
  async (req, res) => {
    try {
      const scores =
        await RecommendationScore
          .find({
            userId:
              req.user.id,
          })
          .sort({
            score: -1,
          })
          .limit(20)
          .populate(
            "mediaId"
          );

      const media =
        scores.map(
          (
            item
          ) =>
            item.mediaId
        );

      res.json(media);
    } catch (err) {
      res.status(500).json({
        error:
          err.message,
      });
    }
  };