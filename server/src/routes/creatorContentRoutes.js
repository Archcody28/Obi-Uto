const express =
  require("express");

const {
  getCreatorContent,
} = require(
  "../controllers/creatorContentController"
);

const router =
  express.Router();

router.get(
  "/:creatorId/content",
  getCreatorContent
);

module.exports =
  router;