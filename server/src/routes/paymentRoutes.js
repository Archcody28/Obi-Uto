const express =
  require("express");

const {
  createCheckout,
  purchaseCoins,
  verifyCheckout,
  handleWebhook,
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

// Paystack webhook - no auth middleware (Paystack signs the request)
router.post(
  "/webhook",
  express.raw({
    type: "application/json",
  }),
  handleWebhook
);

module.exports =
  router;