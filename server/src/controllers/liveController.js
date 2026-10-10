"use strict";
/*
 * Phase 29 — DEPRECATED legacy live controller.
 *
 * The old implementation used a `status` field that never existed on the
 * LiveStream schema and skipped ownership checks entirely (any authenticated
 * user could start/end any stream). It is now a thin adapter over the
 * canonical live-stream subsystem so legacy /api/live clients keep working
 * with correct authorization and without conflicting lifecycle semantics.
 */
const {
  createStream,
  getLiveStreams,
  startStream,
  endStream,
  scheduleStream,
  getDiscovery,
} = require("./liveStreamController");

let warned = false;
function deprecationWarn(handler) {
  return (req, res, next) => {
    if (!warned) {
      console.warn(
        "[live] The /api/live router is deprecated. Use /api/live-streams instead."
      );
      warned = true;
    }
    return handler(req, res, next);
  };
}

exports.scheduleStream = deprecationWarn(scheduleStream);
exports.startStream = deprecationWarn(startStream);
exports.endStream = deprecationWarn(endStream);
exports.getLiveStreams = deprecationWarn(getLiveStreams);

/* Legacy shape: plain array of scheduled streams. */
exports.getUpcomingStreams = deprecationWarn(async (req, res, next) => {
  try {
    const discoveryReq = { ...req, params: req.params };
    const json = res.json.bind(res);

    res.json = (payload) => json(payload && payload.upcoming ? payload.upcoming : payload);

    return getDiscovery(discoveryReq, res);
  } catch (err) {
    return next(err);
  }
});
