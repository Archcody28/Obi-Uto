const UserReward =
  require("../models/UserReward");

const UserCoinWallet =
  require("../models/UserCoinWallet");

exports.claimDailyReward =
  async (req, res) => {
    try {
      let reward =
        await UserReward.findOne({
          userId:
            req.user.id,
        });

      if (!reward) {
        reward =
          await UserReward.create({
            userId:
              req.user.id,
          });
      }

      const today =
        new Date();

      const last =
        reward.lastClaimedAt;

      if (
        last &&
        today.toDateString() ===
          last.toDateString()
      ) {
        return res
          .status(400)
          .json({
            message:
              "Reward already claimed today",
          });
      }

      /*
       Daily reward formula
      */

      reward.streakDays += 1;

      const coins =
        Math.min(
          reward.streakDays * 10,
          100
        );

      reward.lastClaimedAt =
        today;

      reward.totalRewardsEarned +=
        coins;

      reward.experience +=
        coins;

      reward.level =
        Math.floor(
          reward.experience /
            500
        ) + 1;

      await reward.save();

      await UserCoinWallet.findOneAndUpdate(
        {
          userId:
            req.user.id,
        },
        {
          $inc: {
            coins,
          },
        },
        {
          upsert: true,
        }
      );

      res.json({
        coinsAwarded:
          coins,

        streakDays:
          reward.streakDays,

        level:
          reward.level,
      });
    } catch (err) {
      res.status(500).json({
        error:
          err.message,
      });
    }
  };

exports.getRewards =
  async (req, res) => {
    try {
      const reward =
        await UserReward.findOne({
          userId:
            req.user.id,
        });

      res.json(
        reward || {
          streakDays: 0,
          level: 1,
          experience: 0,
          badges: [],
        }
      );
    } catch (err) {
      res.status(500).json({
        error:
          err.message,
      });
    }
  };