const express =
  require("express");

const {
  getCreatorRevenue,
} = require(
  "../controllers/creatorAnalyticsController"
);

const router =
  express.Router();

router.get(
  "/revenue/:creatorId",
  getCreatorRevenue
);

module.exports =
  router;