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
  getFollowStatus,
  getMyFollows,
} = require(
  "../controllers/followController"
);

const router =
  express.Router();

router.get(
  "/me",
  authMiddleware,
  getMyFollows
);

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
  "/status/:creatorId",
  authMiddleware,
  getFollowStatus
);

router.get(
  "/:creatorId",
  getFollowers
);

module.exports =
  router;