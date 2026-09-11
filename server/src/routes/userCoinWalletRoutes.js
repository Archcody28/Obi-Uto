const express =
  require("express");

const authMiddleware =
  require(
    "../middleware/authMiddleware"
  );

const {
  getWallet,
  getPurchaseHistory,
} = require(
  "../controllers/userCoinWalletController"
);

const router =
  express.Router();

router.get(
  "/",
  authMiddleware,
  getWallet
);

router.get(
  "/history",
  authMiddleware,
  getPurchaseHistory
);

module.exports =
  router;