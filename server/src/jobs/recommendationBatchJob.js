const cron =
  require("node-cron");

const RecommendationScore =
  require(
    "../models/RecommendationScore"
  );

cron.schedule(
  "0 3 * * *",
  async () => {
    try {
      const total =
        await RecommendationScore.countDocuments();

      console.log(
        `✓ Recommendation batch complete (${total} scores)`
      );
    } catch (err) {
      console.error(
        "Recommendation Job:",
        err.message
      );
    }
  }
);