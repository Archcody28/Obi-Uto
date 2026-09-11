const Creator =
  require("../models/Creator");

const CreatorEarning =
  require(
    "../models/CreatorEarning"
  );

exports.getDashboard =
  async (req, res) => {
    try {
      const creator =
        await Creator.findOne({
          userId:
            req.user.id,
        });

      const earnings =
        await CreatorEarning
          .find({
            creatorId:
              creator._id,
          });

      let totalRevenue =
        0;

      let totalStreams =
        0;

      earnings.forEach(
        (item) => {
          totalRevenue +=
            item.revenue;

          totalStreams +=
            item.streams;
        }
      );

      res.json({
        creator,
        totalRevenue,
        totalStreams,
      });
    } catch (err) {
      res.status(500).json({
        message:
          err.message,
      });
    }
  };