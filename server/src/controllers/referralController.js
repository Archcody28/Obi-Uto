const User =
  require("../models/User");

const Referral =
  require("../models/Referral");

const UserCoinWallet =
  require("../models/UserCoinWallet");

exports.applyReferral =
  async (req, res) => {
    try {
      const {
        code,
      } = req.body;

      const referrer =
        await User.findOne({
          referralCode:
            code.toUpperCase(),
        });

      if (!referrer) {
        return res
          .status(404)
          .json({
            message:
              "Invalid referral code",
          });
      }

      if (
        referrer._id.toString() ===
        req.user.id
      ) {
        return res
          .status(400)
          .json({
            message:
              "Cannot refer yourself",
          });
      }

      const exists =
        await Referral.findOne({
          referredUserId:
            req.user.id,
        });

      if (exists) {
        return res
          .status(400)
          .json({
            message:
              "Referral already used",
          });
      }

      await Referral.create({
        referrerId:
          referrer._id,

        referredUserId:
          req.user.id,

        rewardCoins:
          100,
      });

      /*
       Referrer reward
      */

      await UserCoinWallet.findOneAndUpdate(
        {
          userId:
            referrer._id,
        },
        {
          $inc: {
            coins: 100,
          },
        },
        {
          upsert: true,
        }
      );

      /*
       New user reward
      */

      await UserCoinWallet.findOneAndUpdate(
        {
          userId:
            req.user.id,
        },
        {
          $inc: {
            coins: 50,
          },
        },
        {
          upsert: true,
        }
      );

      res.json({
        message:
          "Referral applied",

        referrerReward:
          100,

        userReward:
          50,
      });
    } catch (err) {
      res.status(500).json({
        error:
          err.message,
      });
    }
  };

exports.getReferralCode =
  async (req, res) => {
    try {
      const user =
        await User.findById(
          req.user.id
        );

      res.json({
        referralCode:
          user.referralCode,
      });
    } catch (err) {
      res.status(500).json({
        error:
          err.message,
      });
    }
  };