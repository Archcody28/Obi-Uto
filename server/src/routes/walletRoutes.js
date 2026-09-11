const express =
  require("express");

const {
  getWallet,
  requestWithdrawal,
} = require(
  "../controllers/walletController"
);

const router =
  express.Router();

router.get(
  "/:creatorId",
  getWallet
);

router.post(
  "/withdraw",
  requestWithdrawal
);

module.exports =
  router;