"use strict";
/*
 * Phase 30 — stale mobile-session sweeper.
 * Runs on an interval from index.js: any mobile live stream whose heartbeat
 * is older than the timeout is ended so discovery never shows ghost streams.
 */
const LiveStream = require("../models/LiveStream");

let sweepTimer = null;

async function sweepOnce() {
  try {
    const { sweepStaleMobileSessions } = require("../controllers/liveStreamController");
    const ended = await sweepStaleMobileSessions(new Date());
    if (ended > 0) {
      console.warn(`[live] swept ${ended} stale mobile session(s)`);
      try {
        const { getIO } = require("../socket");
        const io = getIO();
        void io;
      } catch (_err) {
        /* socket unavailable — safe to skip */
      }
    }
    return ended;
  } catch (err) {
    console.error("[live] stale sweep failed:", err.message);
    return 0;
  }
}

function startStaleSweep(intervalMs = 30000) {
  if (sweepTimer) return sweepTimer;
  sweepTimer = setInterval(sweepOnce, intervalMs);
  if (typeof sweepTimer.unref === "function") sweepTimer.unref();
  return sweepTimer;
}

module.exports = { startStaleSweep, sweepOnce };
