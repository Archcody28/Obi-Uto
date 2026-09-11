const cron =
  require("node-cron");

const Notification =
  require(
    "../models/Notification"
  );

cron.schedule(
  "0 2 * * *",
  async () => {
    try {
      const cutoff =
        new Date(
          Date.now() -
          30 *
          24 *
          60 *
          60 *
          1000
        );

      await Notification.deleteMany(
        {
          createdAt: {
            $lt: cutoff,
          },
        }
      );

      console.log(
        "✓ Notifications cleaned"
      );
    } catch (err) {
      console.error(
        "Notification Job:",
        err.message
      );
    }
  }
);