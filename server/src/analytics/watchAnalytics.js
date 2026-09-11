const Media = require("../models/Media");

// SIMPLE ENGAGEMENT TRACKER
exports.trackWatch = async (mediaId, secondsWatched) => {
  const media = await Media.findById(mediaId);

  if (!media) return;

  // boost ranking
  media.views += 1;

  // fake engagement scoring (v1 AI signal)
  media.rating =
    (media.rating + secondsWatched / 1000) / 2;

  await media.save();
};