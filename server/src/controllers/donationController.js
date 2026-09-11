const Donation =
  require("../models/Donation");

const Wallet =
  require("../models/Wallet");

const Transaction =
  require("../models/Transaction");

const Notification =
  require("../models/Notification");

const {
  isValidObjectId,
} = require("../middleware/validationMiddleware");

exports.sendDonation =
  async (req, res) => {
    try {
      const {
        streamId,
        creatorId,
        amount,
        message,
      } = req.body;

      // Validate required fields
      if (!streamId || !isValidObjectId(streamId)) {
        return res.status(400).json({
          message: "Valid streamId is required.",
        });
      }

      if (!creatorId || !isValidObjectId(creatorId)) {
        return res.status(400).json({
          message: "Valid creatorId is required.",
        });
      }

      // Validate amount
      const donationAmount = Number(amount);
      if (
        isNaN(donationAmount) ||
        !isFinite(donationAmount) ||
        donationAmount <= 0
      ) {
        return res.status(400).json({
          message: "Donation amount must be a positive number.",
        });
      }

      // Sensible upper bound
      if (donationAmount > 1000000000) {
        return res.status(400).json({
          message: "Donation amount exceeds maximum allowed value.",
        });
      }

      // Idempotency: check for duplicate donation from same user in last 5 seconds
      const fiveSecondsAgo = new Date(Date.now() - 5000);
      const existingDonation =
        await Donation.findOne({
          donorId: req.user.id,
          creatorId,
          streamId,
          amount: donationAmount,
          createdAt: {
            $gte: fiveSecondsAgo,
          },
        });

      if (existingDonation) {
        return res.json(existingDonation);
      }

      const platformFee =
        donationAmount * 0.1;

      const creatorAmount =
        donationAmount - platformFee;

      const donation =
        await Donation.create({
          streamId,
          donorId:
            req.user.id,
          creatorId,
          amount: donationAmount,
          message:
            typeof message === "string"
              ? message.substring(0, 500)
              : "",
          platformFee,
          creatorAmount,
        });

      // Credit creator wallet
      await Wallet.findOneAndUpdate(
        {
          creatorId,
        },
        {
          $inc: {
            balance:
              creatorAmount,

            totalEarned:
              creatorAmount,
          },
        },
        {
          upsert: true,
        }
      );

      // Create transaction record
      await Transaction.create({
        creatorId,
        amount: creatorAmount,
        type: "earning",
        description: "Donation received",
      });

      // Create notification for creator
      try {
        await Notification.create({
          userId: creatorId,
          title: "New Donation",
          message: `You received a donation of ₦${creatorAmount.toLocaleString()}`,
          type: "donation",
          data: {
            donationId:
              donation._id,

            streamId,
          },
        });
      } catch (notifErr) {
        console.log(
          "Donation notification error:",
          notifErr.message
        );
      }

      res.json(donation);
    } catch (err) {
      console.log(err);

      res.status(500).json({
        message:
          "Donation failed",
      });
    }
  };

  exports.getLeaderboard =
  async (req, res) => {
    const leaders =
      await Donation.aggregate([
        {
          $match: {
            streamId:
              req.params.streamId,
          },
        },

        {
          $group: {
            _id:
              "$donorId",

            total: {
              $sum:
                "$amount",
            },
          },
        },

        {
          $sort: {
            total: -1,
          },
        },

        {
          $limit: 10,
        },
      ]);

    res.json(
      leaders
    );
  };