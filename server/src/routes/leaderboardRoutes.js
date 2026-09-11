const express =
  require("express");

const {
  topFans,
} = require(
  "../controllers/leaderboardController"
);

const router =
  express.Router();

router.get(
  "/fans",
  topFans
);

module.exports =
  router;
  