const Media = require("../models/Media");

// SIMPLE TRENDING LOGIC (V1)
exports.getTrending = async () => {
  const trending = await Media.find()
    .sort({ views: -1, rating: -1 })
    .limit(20);

  return trending;
};

// SIMPLE RECOMMENDATION LOGIC (V1)
exports.getRecommendations = async (user) => {
  const history = user?.watchHistory || [];

  const lastWatchedGenres = history.slice(-5);

  const genreBoost = lastWatchedGenres.map((h) => h.genre);

  const recommendations = await Media.find({
    genre: {
      $in: genreBoost.length ? genreBoost : ["Action", "Drama"],
    },
  })
    .sort({ views: -1, rating: -1 })
    .limit(25);

  return recommendations;
};