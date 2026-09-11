const express =
  require("express");

const router =
  express.Router();

const authMiddleware =
  require(
    "../middleware/authMiddleware"
  );

const {
  sendDonation,
  getLeaderboard,
} = require(
  "../controllers/donationController"
);

router.post(
  "/",
  authMiddleware,
  sendDonation
);

router.get(
  "/leaderboard/:streamId",
  getLeaderboard
);

module.exports =
  router;