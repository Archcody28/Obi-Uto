const cron =
  require("node-cron");

const Media =
  require(
    "../models/Media"
  );

cron.schedule(
  "0 */6 * * *",
  async () => {
    try {
      const media =
        await Media.find();

      for (const item of media) {
        item.trendingScore =
          (item.views || 0) +
          ((item.likes || 0) * 2) +
          ((item.favorites || 0) * 3);

        await item.save();
      }

      console.log(
        "✓ Trending updated"
      );
    } catch (err) {
      console.error(
        "Trending Job:",
        err.message
      );
    }
  }
);