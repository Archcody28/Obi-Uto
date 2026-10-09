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

const {
  getExternalHome,
  getExternalById,
} = require("../controllers/externalMediaController");

const adminMiddleware =
  require("../middleware/adminMiddleware");

const router =
  express.Router();

/* USER */

/* PHASE 26 — external media (Internet Archive). Declared BEFORE "/:id" so
   "external" is never captured as a Mongo id. */
router.get(
  "/external",
  getExternalHome
);

router.get(
  "/external/:id",
  getExternalById
);

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