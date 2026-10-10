"use strict";
/*
 * Phase 29 — DEPRECATED legacy router kept for old clients.
 *
 * It no longer implements its own lifecycle logic; every handler delegates
 * to the canonical live-stream subsystem with real ownership checks.
 * New code must use /api/live-streams (see routes/liveStreamRoutes.js).
 */
const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");

const {
  scheduleStream,
  startStream,
  endStream,
  getUpcomingStreams,
  getLiveStreams,
} = require("../controllers/liveController");

const router = express.Router();

router.get("/", getLiveStreams);
router.get("/upcoming", getUpcomingStreams);
router.post("/schedule", authMiddleware, scheduleStream);
router.patch("/:id/start", authMiddleware, startStream);
router.patch("/:id/end", authMiddleware, endStream);

module.exports = router;
