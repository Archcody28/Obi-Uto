const express =
  require("express");

const authMiddleware =
  require(
    "../middleware/authMiddleware"
  );

const {
  followCreator,
  unfollowCreator,
  getFollowers,
} = require(
  "../controllers/followController"
);

const router =
  express.Router();

router.post(
  "/follow",
  authMiddleware,
  followCreator
);

router.post(
  "/unfollow",
  authMiddleware,
  unfollowCreator
);

router.get(
  "/:creatorId",
  getFollowers
);

module.exports =
  router;