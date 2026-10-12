"use strict";
/*
 * Phase 29 — canonical live-stream router.
 *
 * Public:  GET /live, /discover, /:id  (never expose stream keys)
 * Owner:   POST /, POST /schedule, PUT /start/:id, PUT /end/:id,
 *          PATCH /:id, GET /mine, GET /ingest/:id  (all authenticated and
 *          ownership-verified inside the controller).
 */
const express = require("express");

const {
  createStream,
  getLiveStreams,
  startStream,
  endStream,
  scheduleStream,
  getDiscovery,
  getStream,
  getMyStreams,
  getIngestInfo,
  updateStream,
  mobileSignal,
  getOwnerStatus,
} = require("../controllers/liveStreamController");

const authMiddleware = require("../middleware/authMiddleware");
const { livePollLimiter } = require("../middleware/rateLimitMiddleware");

const router = express.Router();

/* Public discovery/list (no auth required, no secrets returned). */
router.get("/live", getLiveStreams);
router.get("/discover", getDiscovery);

/* Phase 30.3: polling endpoints get the dedicated high-frequency budget
 * (300/min) instead of consuming the shared 100/15min apiLimiter budget. */
router.get("/mine", authMiddleware, livePollLimiter, getMyStreams);
router.get("/ingest/:id", authMiddleware, getIngestInfo);
router.get("/status/:id", authMiddleware, livePollLimiter, getOwnerStatus);
router.post("/mobile-signal/:id", authMiddleware, livePollLimiter, mobileSignal);
router.post("/", authMiddleware, createStream);
router.post("/schedule", authMiddleware, scheduleStream);
router.put("/start/:id", authMiddleware, startStream);
router.put("/end/:id", authMiddleware, endStream);
router.patch("/:id", authMiddleware, updateStream);

/* Public single-stream view. Must stay last so it cannot shadow the
 * literal routes above. */
router.get("/:id", getStream);

module.exports = router;
