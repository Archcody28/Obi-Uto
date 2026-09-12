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

const authMiddleware =
  require(
    "../middleware/authMiddleware"
  );

router.post(
  "/register-token",
  authMiddleware,
  registerPushToken
);

router.post(
  "/notify-me",
  authMiddleware,
  notifyMe
);

router.get(
  "/",
  authMiddleware,
  getNotifications
);

router.put(
  "/read/:id",
  authMiddleware,
  markRead
);

router.put(
  "/read-all",
  authMiddleware,
  markAllRead
);

router.delete(
  "/:id",
  authMiddleware,
  deleteNotification
);

module.exports =
  router;
