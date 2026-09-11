const UserCoinWallet =
  require("../models/UserCoinWallet");

const Payment =
  require("../models/Payment");

exports.getWallet =
  async (req, res) => {
    try {
      const wallet =
        await UserCoinWallet.findOne({
          userId:
            req.user.id,
        });

      res.json(
        wallet || {
          coins: 0,
          totalPurchased: 0,
          totalSpent: 0,
        }
      );
    } catch (err) {
      res.status(500).json({
        error:
          err.message,
      });
    }
  };

exports.getPurchaseHistory =
  async (req, res) => {
    try {
      const history =
        await Payment.find({
          userId:
            req.user.id,

          paymentType:
            "coins",

          status:
            "success",
        })
          .sort({
            createdAt: -1,
          });

      res.json(history);
    } catch (err) {
      res.status(500).json({
        error:
          err.message,
      });
    }
  };