const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const { getHomeFeed } = require("../controllers/homeController");

router.get("/", authMiddleware, getHomeFeed);

module.exports = router;