const express =
  require("express");

const router =
  express.Router();

const authMiddleware =
  require(
    "../middleware/authMiddleware"
  );

const {
  getTrending,
  getSimilar,
  getRecommended,
} = require(
  "../controllers/recommendationController"
);

router.get(
  "/trending",
  getTrending
);

router.get(
  "/similar/:id",
  getSimilar
);

router.get(
  "/recommended",
  authMiddleware,
  getRecommended
);

module.exports =
  router;