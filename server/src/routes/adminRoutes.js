const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const {
  uploadMedia,
  deleteMedia,
} = require("../controllers/adminController");

// ALL ADMIN ROUTES PROTECTED
router.post(
  "/upload",
  authMiddleware,
  adminMiddleware,
  uploadMedia
);

router.delete(
  "/media/:id",
  authMiddleware,
  adminMiddleware,
  deleteMedia
);

module.exports = router;