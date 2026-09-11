const express =
  require("express");

const {
  toggleLike,
  addComment,
  getComments,
  addReview,
} = require(
  "../controllers/engagementController"
);

const authMiddleware =
  require(
    "../middleware/authMiddleware"
  );

const router =
  express.Router();

router.post(
  "/like",
  authMiddleware,
  toggleLike
);

router.post(
  "/comment",
  authMiddleware,
  addComment
);

router.post(
  "/review",
  authMiddleware,
  addReview
);

router.get(
  "/comments/:mediaId",
  getComments
);

module.exports =
  router;