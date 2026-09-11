const express =
  require("express");

const {
  createCheckout,
  purchaseCoins,
  verifyCheckout,
} = require(
  "../controllers/paymentController"
);

const authMiddleware =
  require(
    "../middleware/authMiddleware"
  );

const router =
  express.Router();

router.post(
  "/checkout",
  authMiddleware,
  createCheckout
);

router.post(
  "/coins",
  authMiddleware,
  purchaseCoins
);

router.get(
  "/verify/:reference",
  verifyCheckout
);

module.exports =
  router;