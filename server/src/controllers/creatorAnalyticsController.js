const Wallet =
  require("../models/Wallet");

const Transaction =
  require("../models/Transaction");

exports.getCreatorRevenue =
  async (req, res) => {
    try {
      const creatorId =
        req.params.creatorId;

      const wallet =
        await Wallet.findOne({
          creatorId,
        });

      const transactions =
        await Transaction.find({
          creatorId,
        })
          .sort({
            createdAt: -1,
          })
          .limit(20);

      res.json({
        balance:
          wallet?.balance || 0,

        totalEarned:
          wallet?.totalEarned || 0,

        totalWithdrawn:
          wallet?.totalWithdrawn || 0,

        recentTransactions:
          transactions,
      });
    } catch (err) {
      res.status(500).json({
        error:
          err.message,
      });
    }
  };