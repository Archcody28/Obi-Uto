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

module.exports =
  router;