const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const {
  uploadMedia,
  deleteMedia,
  getStats,
  listReports,
  getReport,
  updateReport,
  hideMedia,
  restoreMedia,
  warnUser,
  suspendUser,
  unsuspendUser,
  listMedia,
} = require("../controllers/adminController");

// ALL ADMIN ROUTES PROTECTED: auth (401) then DB-backed admin gate (403)
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

router.get("/stats", authMiddleware, adminMiddleware, getStats);

router.get("/media", authMiddleware, adminMiddleware, listMedia);

router.get("/reports", authMiddleware, adminMiddleware, listReports);

router.get("/reports/:id", authMiddleware, adminMiddleware, getReport);

router.patch("/reports/:id", authMiddleware, adminMiddleware, updateReport);

router.post("/media/:id/hide", authMiddleware, adminMiddleware, hideMedia);

router.post("/media/:id/restore", authMiddleware, adminMiddleware, restoreMedia);

router.post("/users/:id/warn", authMiddleware, adminMiddleware, warnUser);

router.post("/users/:id/suspend", authMiddleware, adminMiddleware, suspendUser);

router.post("/users/:id/unsuspend", authMiddleware, adminMiddleware, unsuspendUser);

module.exports = router;