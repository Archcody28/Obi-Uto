const express =
  require("express");

const router =
  express.Router();

const authMiddleware =
  require(
    "../middleware/authMiddleware"
  );

const {
  saveProgress,
  getProgress,
  continueWatching,
  authorizeDownload,
} = require(
  "../controllers/watchController"
);

router.post(
  "/progress",
  authMiddleware,
  saveProgress
);

router.get(
  "/progress/:mediaId",
  authMiddleware,
  getProgress
);

router.get(
  "/continue",
  authMiddleware,
  continueWatching
);

router.get(
  "/download/:mediaId",
  authMiddleware,
  authorizeDownload
);

module.exports =
  router;