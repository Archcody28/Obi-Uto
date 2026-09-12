const Creator =
  require("../models/Creator");

const Media =
  require("../models/Media");

exports.createCreator =
  async (req, res) => {
    try {
      const creator =
        await Creator.create({
          userId:
            req.user.id,

          displayName:
            req.body.displayName,

          bio:
            req.body.bio,
        });

      res.status(201).json(
        creator
      );
    } catch (err) {
      res.status(500).json({
        message:
          err.message,
      });
    }
  };

exports.getMyCreatorProfile =
  async (req, res) => {
    try {
      const creator =
        await Creator.findOne({
          userId:
            req.user.id,
        });

      res.json(
        creator
      );
    } catch (err) {
      res.status(500).json({
        message:
          err.message,
      });
    }
  };

exports.getMyContent =
  async (req, res) => {
    try {
      const creator =
        await Creator.findOne({
          userId:
            req.user.id,
        });

      if (!creator) {
        return res.json(null);
      }

      const content =
        await Media.find({
          creatorId:
            creator._id,
        });

      res.json(content);
    } catch (err) {
      res.status(500).json({
        message:
          err.message,
      });
    }
  };
