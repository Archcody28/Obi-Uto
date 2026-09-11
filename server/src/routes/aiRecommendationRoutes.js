const express =
  require("express");

const authMiddleware =
  require(
    "../middleware/authMiddleware"
  );

const {
  getForYou,
} = require(
  "../controllers/aiRecommendationController"
);

const router =
  express.Router();

router.get(
  "/for-you",
  authMiddleware,
  getForYou
);

module.exports =
  router;