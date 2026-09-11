const Wallet =
  require("../models/Wallet");

const Withdrawal =
  require("../models/Withdrawal");

const Transaction =
  require("../models/Transaction");

const Creator =
  require("../models/Creator");

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
      const { amount } = req.body;

      // Verify the authenticated user owns a creator profile
      const creator =
        await Creator.findOne({
          userId: req.user.id,
        });

      if (!creator) {
        return res
          .status(403)
          .json({
            message:
              "Only creators can request withdrawals",
          });
      }

      // Validate amount
      const withdrawalAmount =
        Number(amount);

      if (
        isNaN(withdrawalAmount) ||
        !isFinite(withdrawalAmount) ||
        withdrawalAmount <= 0
      ) {
        return res
          .status(400)
          .json({
            message:
              "Amount must be a positive number",
          });
      }

      if (withdrawalAmount > 1000000000) {
        return res
          .status(400)
          .json({
            message:
              "Amount exceeds maximum allowed value",
          });
      }

      const wallet =
        await Wallet.findOne({
          creatorId:
            creator._id,
        });

      if (
        !wallet ||
        wallet.balance <
          withdrawalAmount
      ) {
        return res
          .status(400)
          .json({
            message:
              "Insufficient balance",
          });
      }

      wallet.balance -=
        withdrawalAmount;

      await wallet.save();

      await Withdrawal.create(
        {
          creatorId:
            creator._id,
          amount:
            withdrawalAmount,
        }
      );

      await Transaction.create(
        {
          creatorId:
            creator._id,
          amount:
            withdrawalAmount,
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