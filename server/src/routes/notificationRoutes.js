const express =
  require("express");

const router =
  express.Router();

const {
  registerPushToken,
  getNotifications,
  markRead,
  markAllRead,
  deleteNotification,
  notifyMe,
} = require(
  "../controllers/notificationController"
);

router.post(
  "/register-token",
  registerPushToken
);

router.post(
  "/notify-me",
  notifyMe
);

router.get(
  "/:userId",
  getNotifications
);

router.put(
  "/read/:id",
  markRead
);

router.put(
  "/read-all/:userId",
  markAllRead
);

router.delete(
  "/:id",
  deleteNotification
);

module.exports =
  router;
