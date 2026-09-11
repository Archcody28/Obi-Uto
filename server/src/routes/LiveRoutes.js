const express =
  require("express");

const router =
  express.Router();

const authMiddleware =
  require(
    "../middleware/authMiddleware"
  );

const {
  scheduleStream,
  startStream,
  endStream,
  getUpcomingStreams,
  getLiveStreams,
} = require(
  "../controllers/liveController"
);

router.get(
  "/",
  getLiveStreams
);

router.get(
  "/upcoming",
  getUpcomingStreams
);

router.post(
  "/schedule",
  authMiddleware,
  scheduleStream
);

router.patch(
  "/:id/start",
  authMiddleware,
  startStream
);

router.patch(
  "/:id/end",
  authMiddleware,
  endStream
);

module.exports =
  router;