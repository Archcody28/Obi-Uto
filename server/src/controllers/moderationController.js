const Media =
  require("../models/Media");

exports.pendingMedia =
  async (req, res) => {
    const media =
      await Media.find({
        status:
          "pending",
      });

    res.json(media);
  };

exports.approveMedia =
  async (req, res) => {
    const media =
      await Media.findByIdAndUpdate(
        req.params.id,
        {
          status:
            "approved",
        },
        {
          new: true,
        }
      );

    res.json(media);
  };

exports.rejectMedia =
  async (req, res) => {
    const media =
      await Media.findByIdAndUpdate(
        req.params.id,
        {
          status:
            "rejected",
        },
        {
          new: true,
        }
      );

    res.json(media);
  };