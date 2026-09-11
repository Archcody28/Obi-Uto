const Like =
  require("../models/Like");

const Comment =
  require("../models/Comment");

const Review =
  require("../models/Review");

const Media =
  require("../models/Media");

const {
  creditCreator,
} = require(
  "../services/revenueService"
);

/* TOGGLE LIKE */

const toggleLike =
  async (req, res) => {
    try {
      const {
        mediaId,
      } = req.body;

      const existing =
        await Like.findOne({
          userId:
            req.user.id,

          mediaId,
        });

      if (existing) {
        await existing.deleteOne();

        await Media.findByIdAndUpdate(
          mediaId,
          {
            $inc: {
              likes: -1,
            },
          }
        );

        return res.json({
          liked: false,
        });
      }

      await Like.create({
        userId:
          req.user.id,

        mediaId,
      });

      await Media.findByIdAndUpdate(
        mediaId,
        {
          $inc: {
            likes: 1,
          },
        }
      );

      /*
       Creator revenue
      */
      const media =
        await Media.findById(
          mediaId
        );

      if (
        media?.creator
      ) {
        await creditCreator(
          media.creator,
          0.02,
          "Media Like Revenue"
        );
      }

      res.json({
        liked: true,
      });
    } catch (err) {
      console.log(err);

      res.status(500).json({
        message:
          "Failed to toggle like",
      });
    }
  };

/* ADD COMMENT */

const addComment =
  async (req, res) => {
    try {
      const {
        mediaId,
        text,
        parentComment,
      } = req.body;

      const comment =
        await Comment.create({
          userId:
            req.user.id,

          mediaId,

          text,

          parentComment:
            parentComment ||
            null,
        });

      await Media.findByIdAndUpdate(
        mediaId,
        {
          $inc: {
            comments: 1,
          },
        }
      );

      /*
       Creator revenue
      */
      const media =
        await Media.findById(
          mediaId
        );

      if (
        media?.creator
      ) {
        await creditCreator(
          media.creator,
          0.05,
          "Comment Revenue"
        );
      }

      res.status(201).json(
        comment
      );
    } catch (err) {
      console.log(err);

      res.status(500).json({
        message:
          "Failed to comment",
      });
    }
  };

/* GET COMMENTS */

const getComments =
  async (req, res) => {
    try {
      const comments =
        await Comment.find({
          mediaId:
            req.params
              .mediaId,
        })
          .populate(
            "userId",
            "name avatar"
          )
          .sort({
            createdAt: -1,
          });

      res.json(
        comments
      );
    } catch (err) {
      console.log(err);

      res.status(500).json({
        message:
          "Failed to load comments",
      });
    }
  };

/* REVIEW */

const addReview =
  async (req, res) => {
    try {
      const review =
        await Review.create(
          req.body
        );

      res.json(review);
    } catch (err) {
      res.status(500).json({
        error:
          err.message,
      });
    }
  };

module.exports = {
  toggleLike,
  addComment,
  getComments,
  addReview,
};
