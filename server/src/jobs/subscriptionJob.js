const cron =
  require("node-cron");

const UserSubscription =
  require(
    "../models/UserSubscription"
  );

cron.schedule(
  "0 0 * * *",
  async () => {
    try {
      const now =
        new Date();

      await UserSubscription.updateMany(
        {
          endDate: {
            $lt: now,
          },

          status:
            "active",
        },
        {
          status:
            "expired",
        }
      );

      console.log(
        "✓ Subscriptions checked"
      );
    } catch (err) {
      console.error(
        "Subscription Job:",
        err.message
      );
    }
  }
);