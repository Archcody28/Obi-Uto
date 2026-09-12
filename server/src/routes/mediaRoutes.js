const express = require("express");

const {
  getHomeMedia,
  searchMedia,
  getSeriesEpisodes,
  createMedia,
  getAllMedia,
  getMediaById,
  deleteMedia,
} = require("../controllers/mediaController");

const authMiddleware =
  require("../middleware/authMiddleware");

const adminMiddleware =
  require("../middleware/adminMiddleware");

const router =
  express.Router();

/* USER */

router.get(
  "/home",
  getHomeMedia
);

router.get(
  "/search",
  searchMedia
);

router.get(
  "/series/:id/episodes",
  getSeriesEpisodes
)

/* MEDIA */

router.get(
  "/",
  getAllMedia
);

router.get(
  "/:id",
  authMiddleware,
  getMediaById
);

/* ADMIN */

router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  createMedia
);

router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  deleteMedia
);

module.exports = router;