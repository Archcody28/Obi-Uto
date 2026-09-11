const UserCoinWallet =
  require("../models/UserCoinWallet");

exports.topFans =
  async (req, res) => {
    try {
      const fans =
        await UserCoinWallet
          .find()
          .populate(
            "userId",
            "name avatar"
          )
          .sort({
            totalSpent: -1,
          })
          .limit(20);

      res.json(fans);
    } catch (err) {
      res.status(500).json({
        error:
          err.message,
      });
    }
  };