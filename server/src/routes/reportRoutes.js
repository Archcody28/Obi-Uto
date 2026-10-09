const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const { createReport } = require("../controllers/reportController");

// Authenticated users only (401 when unauthenticated)
router.post("/", authMiddleware, createReport);

module.exports = router;
