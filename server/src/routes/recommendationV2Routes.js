const express =
  require("express");

const authMiddleware =
  require(
    "../middleware/authMiddleware"
  );

const {
  getForYou,
  similarContent,
} = require(
  "../controllers/recommendationV2Controller"
);

const router =
  express.Router();

router.get(
  "/for-you",
  authMiddleware,
  getForYou
);

router.get(
  "/similar/:id",
  similarContent
);

module.exports =
  router;