const express =
  require("express");

const router =
  express.Router();

const authMiddleware =
  require(
    "../middleware/authMiddleware"
  );

const {
  createCreator,
  getMyCreatorProfile,
  getCreatorById,
  getCreatorContent,
  getMyContent,
} = require(
  "../controllers/creatorController"
);

router.post(
  "/register",
  authMiddleware,
  createCreator
);

router.get(
  "/me",
  authMiddleware,
  getMyCreatorProfile
);

router.get(
  "/content",
  authMiddleware,
  getMyContent
);

router.get(
  "/:id/content",
  getCreatorContent
);

router.get(
  "/:id",
  getCreatorById
);

module.exports =
  router;