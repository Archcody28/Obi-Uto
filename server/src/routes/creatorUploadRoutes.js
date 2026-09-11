const express =
  require("express");

const router =
  express.Router();

const authMiddleware =
  require(
    "../middleware/authMiddleware"
  );

const {
  createContent,
  myUploads,
} = require(
  "../controllers/creatorUploadController"
);

router.post(
  "/content",
  authMiddleware,
  createContent
);

router.get(
  "/content",
  authMiddleware,
  myUploads
);

module.exports =
  router;