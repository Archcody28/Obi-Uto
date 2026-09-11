const UserCoinWallet =
  require("../models/UserCoinWallet");

exports.getBalance =
  async (req, res) => {
    try {
      let wallet =
        await UserCoinWallet.findOne({
          userId: req.user.id,
        });

      if (!wallet) {
        wallet =
          await UserCoinWallet.create({
            userId: req.user.id,
          });
      }

      res.json(wallet);
    } catch (err) {
      res.status(500).json({
        message:
          err.message,
      });
    }
  };