const express =
  require("express");

const {
  addFavorite,
  getFavorites,
  removeFavorite,
} = require(
  "../controllers/favoriteController"
);

const authMiddleware =
  require(
    "../middleware/authMiddleware"
  );

const router =
  express.Router();

router.post(
  "/",
  authMiddleware,
  addFavorite
);

router.get(
  "/",
  authMiddleware,
  getFavorites
);

router.delete(
  "/:mediaId",
  authMiddleware,
  removeFavorite
);

module.exports = router;