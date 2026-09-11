const Notification =
  require("../models/Notification");

const PushToken =
  require("../models/PushToken");

const LiveStream =
  require("../models/LiveStream");

/*
 Register Push Token
*/

exports.registerPushToken =
  async (req, res) => {
    try {
      const {
        userId,
        token,
        platform,
      } = req.body;

      const pushToken =
        await PushToken.findOneAndUpdate(
          {
            userId,
          },
          {
            token,
            platform,
          },
          {
            upsert: true,
            new: true,
          }
        );

      res.json(pushToken);
    } catch (err) {
      res.status(500).json({
        error: err.message,
      });
    }
  };

/*
 Get Notifications
*/

exports.getNotifications =
  async (req, res) => {
    try {
      const notifications =
        await Notification.find({
          userId:
            req.params.userId,
        })
          .sort({
            createdAt: -1,
          });

      res.json(
        notifications
      );
    } catch (err) {
      res.status(500).json({
        error: err.message,
      });
    }
  };

/*
 Mark One Read
*/

exports.markRead =
  async (req, res) => {
    try {
      const notification =
        await Notification.findByIdAndUpdate(
          req.params.id,
          {
            read: true,
          },
          {
            new: true,
          }
        );

      res.json(
        notification
      );
    } catch (err) {
      res.status(500).json({
        error: err.message,
      });
    }
  };

/*
 Mark All Read
*/

exports.markAllRead =
  async (req, res) => {
    try {
      await Notification.updateMany(
        {
          userId:
            req.params.userId,
        },
        {
          read: true,
        }
      );

      res.json({
        message:
          "All notifications marked as read",
      });
    } catch (err) {
      res.status(500).json({
        error: err.message,
      });
    }
  };

/*
 Delete Notification
*/

exports.deleteNotification =
  async (req, res) => {
    try {
      await Notification.findByIdAndDelete(
        req.params.id
      );

      res.json({
        message:
          "Notification deleted",
      });
    } catch (err) {
      res.status(500).json({
        error: err.message,
      });
    }
  };

exports.notifyMe =
  async (req, res) => {
    try {
      const {
        streamId,
        userId,
      } = req.body;

      if (!streamId || !userId) {
        return res.status(400).json({
          error:
            "streamId and userId are required",
        });
      }

      const stream =
        await LiveStream.findByIdAndUpdate(
          streamId,
          {
            $addToSet: {
              notifyUsers: userId,
            },
          },
          {
            new: true,
          }
        );

      if (!stream) {
        return res.status(404).json({
          error:
            "Stream not found",
        });
      }

      res.json({
        message:
          "Notification subscription saved",
      });
    } catch (err) {
      res.status(500).json({
        error: err.message,
      });
    }
  };
