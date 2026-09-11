const express =
  require("express");

const {
  getKPI,
} = require(
  "../controllers/kpiController"
);

const router =
  express.Router();

router.get(
  "/",
  getKPI
);

module.exports =
  router;