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
  deleteMyContent,
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

router.delete(
  "/content/:id",
  authMiddleware,
  deleteMyContent
);

module.exports =
  router;
