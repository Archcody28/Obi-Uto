const express =
  require("express");

const router =
  express.Router();

const {
  getMessages,
} = require(
  "../controllers/liveChatController"
);

router.get(
  "/:streamId",
  getMessages
);

module.exports =
  router;