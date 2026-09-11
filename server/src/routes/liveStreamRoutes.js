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

router.post(
  "/",
  createStream
);
const authMiddleware = require("../middleware/authMiddleware");

router.get(
  "/live",
  getLiveStreams
);

router.put(
  "/start/:id",
  startStream
);

router.put(
  "/end/:id",
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