const Wallet =
  require("../models/Wallet");

const Withdrawal =
  require("../models/Withdrawal");

const Transaction =
  require("../models/Transaction");

/* GET WALLET */

const getWallet =
  async (req, res) => {
    try {
      let wallet =
        await Wallet.findOne({
          creatorId:
            req.params.creatorId,
        });

      if (!wallet) {
        wallet =
          await Wallet.create({
            creatorId:
              req.params.creatorId,
          });
      }

      res.json(wallet);
    } catch (err) {
      res.status(500).json({
        error:
          err.message,
      });
    }
  };

/* REQUEST WITHDRAWAL */

const requestWithdrawal =
  async (req, res) => {
    try {
      const {
        creatorId,
        amount,
      } = req.body;

      const wallet =
        await Wallet.findOne({
          creatorId,
        });

      if (
        !wallet ||
        wallet.balance <
          amount
      ) {
        return res
          .status(400)
          .json({
            message:
              "Insufficient balance",
          });
      }

      wallet.balance -=
        amount;

      await wallet.save();

      await Withdrawal.create(
        {
          creatorId,
          amount,
        }
      );

      await Transaction.create(
        {
          creatorId,
          amount,
          type:
            "withdrawal",
          description:
            "Withdrawal Request",
        }
      );

      res.json({
        message:
          "Withdrawal submitted",
      });
    } catch (err) {
      res.status(500).json({
        error:
          err.message,
      });
    }
  };

module.exports = {
  getWallet,
  requestWithdrawal,
};