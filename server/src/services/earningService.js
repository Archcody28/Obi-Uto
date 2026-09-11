const CreatorEarning =
  require(
    "../models/CreatorEarning"
  );

exports.addStreamRevenue =
  async (
    creatorId,
    mediaId
  ) => {
    const payout =
      0.002;

    await CreatorEarning
      .findOneAndUpdate(
        {
          creatorId,
          mediaId,
        },
        {
          $inc: {
            streams: 1,
            revenue:
              payout,
          },
        },
        {
          upsert: true,
        }
      );
  };