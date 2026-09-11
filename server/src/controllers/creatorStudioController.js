const Media =
  require("../models/Media");

exports.uploadMedia =
  async (req, res) => {
    try {
      const media =
        await Media.create({
          ...req.body,

          creator:
            req.user.creatorId,
        });

      return res
        .status(201)
        .json(media);
    } catch (err) {
      return res
        .status(500)
        .json({
          error:
            err.message,
        });
    }
  };
  exports.myMedia =
  async (req, res) => {
    const media =
      await Media.find({
        creator:
          req.user.creatorId,
      });

    res.json(media);
  };
  exports.updateMedia =
  async (req, res) => {
    const media =
      await Media.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          new: true,
        }
      );

    res.json(media);
  };
  exports.deleteMedia =
  async (req, res) => {
    await Media.findByIdAndDelete(
      req.params.id
    );

    res.json({
      message:
        "Deleted",
    });
  };