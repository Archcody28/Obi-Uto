const express =
  require("express");

const {
  getPlans,
} = require(
  "../controllers/subscriptionController"
);

const router =
  express.Router();

router.get(
  "/plans",
  getPlans
);

module.exports =
  router;