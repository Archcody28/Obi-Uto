const cron =
  require("node-cron");

const Wallet =
  require(
    "../models/Wallet"
  );

cron.schedule(
  "0 1 * * *",
  async () => {
    try {
      const wallets =
        await Wallet.find();

      for (const wallet of wallets) {
        wallet.pendingBalance +=
          wallet.balance;

        wallet.balance = 0;

        await wallet.save();
      }

      console.log(
        "✓ Creator payouts processed"
      );
    } catch (err) {
      console.error(
        "Payout Job:",
        err.message
      );
    }
  }
);