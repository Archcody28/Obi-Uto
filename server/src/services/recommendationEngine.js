const RecommendationScore =
  require(
    "../models/RecommendationScore"
  );
const WatchSession =
  require(
    "../models/WatchSession"
  );

const Media =
  require(
    "../models/Media"
  );

async function updateScore(
  userId,
  mediaId,
  points
) {
  await RecommendationScore.findOneAndUpdate(
    {
      userId,
      mediaId,
    },
    {
      $inc: {
        score: points,
      },
    },
    {
      upsert: true,
    }
  );
}
async function buildUserProfile(
  userId
) {
  const sessions =
    await WatchSession.find({
      userId,
    }).populate(
      "mediaId"
    );

  const genres = {};

  sessions.forEach(
    (session) => {
      const media =
        session.mediaId;

      if (!media) return;

      media.genres?.forEach(
        (genre) => {
          genres[genre] =
            (genres[
              genre
            ] || 0) + 1;
        }
      );
    }
  );

  return genres;
}

module.exports = {
  updateScore,
  buildUserProfile,
};