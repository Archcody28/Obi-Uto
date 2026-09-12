const express =
  require("express");

const {
  createStream,
  getLiveStreams,
  startStream,
  endStream,
  scheduleStream,
  getDiscovery,
} = require(
  "../controllers/liveStreamController"
);

const router =
  express.Router();
const authMiddleware = require("../middleware/authMiddleware");

router.post(
  "/",
  authMiddleware,
  createStream
);

router.get(
  "/live",
  getLiveStreams
);

router.put(
  "/start/:id",
  authMiddleware,
  startStream
);

router.put(
  "/end/:id",
  authMiddleware,
  endStream
);

router.post(
  "/schedule",
  authMiddleware,
  scheduleStream
);
router.get(
"/discover",
getDiscovery
);
module.exports =
  router;
