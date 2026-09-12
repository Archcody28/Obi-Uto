const Follow =
  require("../models/Follow");

const Creator =
  require("../models/Creator");

/* FOLLOW */

const followCreator =
  async (req, res) => {
    try {
      const {
        creatorId,
      } = req.body;

      // Server-derived identity — never trust client userId
      const userId =
        req.user.id;

      if (!creatorId) {
        return res.status(400).json({
          message:
            "creatorId is required",
        });
      }

      const existing =
        await Follow.findOne({
          userId,
          creatorId,
        });

      if (existing) {
        return res.status(400).json({
          message:
            "Already following",
        });
      }

      await Follow.create({
        userId,
        creatorId,
      });

      await Creator.findByIdAndUpdate(
        creatorId,
        {
          $inc: {
            followers: 1,
          },
        }
      );

      res.json({
        message:
          "Creator followed",
      });
    } catch (err) {
      res.status(500).json({
        error:
          err.message,
      });
    }
  };

/* UNFOLLOW */

const unfollowCreator =
  async (req, res) => {
    try {
      const {
        creatorId,
      } = req.body;

      // Server-derived identity — never trust client userId
      const userId =
        req.user.id;

      if (!creatorId) {
        return res.status(400).json({
          message:
            "creatorId is required",
        });
      }

      await Follow.findOneAndDelete(
        {
          userId,
          creatorId,
        }
      );

      await Creator.findByIdAndUpdate(
        creatorId,
        {
          $inc: {
            followers: -1,
          },
        }
      );

      res.json({
        message:
          "Creator unfollowed",
      });
    } catch (err) {
      res.status(500).json({
        error:
          err.message,
      });
    }
  };

/* GET FOLLOWERS */

const getFollowers =
  async (req, res) => {
    try {
      const followers =
        await Follow.find({
          creatorId:
            req.params.creatorId,
        });

      res.json(followers);
    } catch (err) {
      res.status(500).json({
        error:
          err.message,
      });
    }
  };

module.exports = {
  followCreator,
  unfollowCreator,
  getFollowers,
};