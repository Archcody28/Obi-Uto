const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const { saveProgress } = require("../controllers/historyController");

router.post("/progress", authMiddleware, saveProgress);

module.exports = router;