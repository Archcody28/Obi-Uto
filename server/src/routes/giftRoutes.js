const express =
  require("express");

const router =
  express.Router();

const authMiddleware =
  require(
    "../middleware/authMiddleware"
  );

const {
  sendGift,
  getGifts,
} = require(
  "../controllers/giftController"
);

router.get(
  "/",
  getGifts
);

router.post(
  "/send",
  authMiddleware,
  sendGift
);

module.exports =
  router;