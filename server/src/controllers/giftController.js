const Gift =
  require("../models/Gift");

const GiftTransaction =
  require(
    "../models/GiftTransaction"
  );

const UserCoinWallet =
  require(
    "../models/UserCoinWallet"
  );

const Wallet =
  require("../models/Wallet");

const Transaction =
  require(
    "../models/Transaction"
  );

exports.sendGift =
  async (req, res) => {
    try {
      const {
        streamId,
        creatorId,
        giftId,
        quantity = 1,
      } = req.body;

      const gift =
        await Gift.findById(
          giftId
        );

      if (!gift) {
        return res
          .status(404)
          .json({
            message:
              "Gift not found",
          });
      }

      const totalCoins =
        gift.coinCost *
        quantity;

      const userWallet =
        await UserCoinWallet.findOne(
          {
            userId:
              req.user.id,
          }
        );

      if (
        !userWallet ||
        userWallet.coins <
          totalCoins
      ) {
        return res
          .status(400)
          .json({
            message:
              "Insufficient coins",
          });
      }

      userWallet.coins -=
        totalCoins;

      userWallet.totalSpent +=
        totalCoins;

      await userWallet.save();

      const creatorEarning =
        gift.creatorValue *
        quantity;

      const platformFee =
        totalCoins -
        creatorEarning;

      let creatorWallet =
        await Wallet.findOne({
          creatorId,
        });

      if (!creatorWallet) {
        creatorWallet =
          await Wallet.create({
            creatorId,
          });
      }

      creatorWallet.balance +=
        creatorEarning;

      creatorWallet.totalEarned +=
        creatorEarning;

      await creatorWallet.save();

      const transaction =
        await GiftTransaction.create(
          {
            streamId,
            senderId:
              req.user.id,
            creatorId,
            giftId,
            quantity,
            totalCoins,
            creatorEarning,
            platformFee,
          }
        );

      await Transaction.create(
        {
          creatorId,
          amount:
            creatorEarning,
          type:
            "earning",
          description:
            `Gift: ${gift.name}`,
        }
      );

      res.json({
        message:
          "Gift sent",
        transaction,
      });
    } catch (err) {
      console.log(err);

      res.status(500).json({
        message:
          "Failed to send gift",
      });
    }
  };

exports.getGifts =
  async (req, res) => {
    const gifts =
      await Gift.find({
        active: true,
      });

    res.json(gifts);
  };