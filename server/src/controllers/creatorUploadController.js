const Media =
  require("../models/Media");

const Creator =
  require("../models/Creator");

exports.createContent =
  async (req, res) => {
    try {
      const creator =
        await Creator.findOne({
          userId:
            req.user.id,
        });

      if (!creator) {
        return res
          .status(403)
          .json({
            message:
              "Creator account required",
          });
      }

      const media =
        await Media.create({
          title:
            req.body.title,

          description:
            req.body.description,

          type:
            req.body.type,

          genre:
            req.body.genre,

          thumbnail:
            req.body.thumbnail,

          banner:
            req.body.banner,

          videoUrl:
            req.body.videoUrl,

          audioUrl:
            req.body.audioUrl,

          creatorId:
            creator._id,

          uploadedBy:
            req.user.id,

          status:
            "pending",
        });

      res.status(201).json(
        media
      );
    } catch (err) {
      res.status(500).json({
        message:
          err.message,
      });
    }
  };
  exports.myUploads =
  async (req, res) => {
    try {
      const creator =
        await Creator.findOne({
          userId:
            req.user.id,
        });

      const uploads =
        await Media.find({
          creatorId:
            creator._id,
        }).sort({
          createdAt: -1,
        });

      res.json(
        uploads
      );
    } catch (err) {
      res.status(500).json({
        message:
          err.message,
      });
    }
  };