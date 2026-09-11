const express =
  require("express");

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
  followCreator
);

router.post(
  "/unfollow",
  unfollowCreator
);

router.get(
  "/:creatorId",
  getFollowers
);

module.exports =
  router;