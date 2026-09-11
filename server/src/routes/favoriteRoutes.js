const express =
  require("express");

const {
  addFavorite,
  getFavorites,
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

module.exports = router;