const express =
  require("express");

const authMiddleware =
  require(
    "../middleware/authMiddleware"
  );

const {
  claimDailyReward,
  getRewards,
} = require(
  "../controllers/rewardController"
);

const router =
  express.Router();

router.post(
  "/daily",
  authMiddleware,
  claimDailyReward
);

router.get(
  "/",
  authMiddleware,
  getRewards
);

module.exports =
  router;