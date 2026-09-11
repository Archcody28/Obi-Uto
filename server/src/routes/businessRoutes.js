const express =
  require("express");

const {
  getRevenue,
} = require(
  "../controllers/businessController"
);

const router =
  express.Router();

router.get(
  "/revenue",
  getRevenue
);

module.exports =
  router;