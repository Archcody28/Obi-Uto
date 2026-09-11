const express =
  require("express");

const authMiddleware =
  require(
    "../middleware/authMiddleware"
  );

const {
  applyReferral,
  getReferralCode,
} = require(
  "../controllers/referralController"
);

const router =
  express.Router();

router.post(
  "/apply",
  authMiddleware,
  applyReferral
);

router.get(
  "/code",
  authMiddleware,
  getReferralCode
);

module.exports =
  router;