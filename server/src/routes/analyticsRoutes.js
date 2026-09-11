const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const {
  getAnalytics,
  getCreatorAnalytics,
} = require("../controllers/analyticsController");

// ======================
// ADMIN PLATFORM ANALYTICS
// ======================
router.get(
  "/",
  authMiddleware,
  adminMiddleware,
  getAnalytics
);

// ======================
// CREATOR ANALYTICS
// ======================
router.get(
  "/creator/:creatorId",
  authMiddleware,
  getCreatorAnalytics
);

module.exports = router;