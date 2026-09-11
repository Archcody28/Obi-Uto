const express =
  require("express");

const router =
  express.Router();

const authMiddleware =
  require(
    "../middleware/authMiddleware"
  );

const {
  uploadMedia,
  myMedia,
  updateMedia,
  deleteMedia,
} = require(
  "../controllers/creatorStudioController"
);

router.post(
  "/upload",
  authMiddleware,
  uploadMedia
);

router.get(
  "/my-media",
  authMiddleware,
  myMedia
);

router.put(
  "/:id",
  authMiddleware,
  updateMedia
);

router.delete(
  "/:id",
  authMiddleware,
  deleteMedia
);

module.exports =
  router;