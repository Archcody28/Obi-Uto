"use strict";
/*
 * Phase 29 — canonical live-stream controller.
 *
 * Lifecycle: created (waiting) -> published via RTMP (live) -> ended.
 * - "isLive" is only ever set to true by real RTMP ingest (mediaServer
 *   postPublish). Creating or scheduling a stream never marks it live.
 * - "ended" is authoritative once endedAt is set; a stream cannot go back
 *   to live without a new publisher attaching (postPublish allows restart).
 *
 * Privacy: streamKey is creator-only. Every public projection goes through
 * sanitizeStream()/sanitizeStreamDoc() which strips streamKey, notifyUsers
 * and other internal fields before the response leaves the server.
 */
const mongoose = require("mongoose");

const LiveStream = require("../models/LiveStream");
const Creator = require("../models/Creator");
const generateStreamKey = require("../utils/generateStreamKey");
const { getIngestInfo } = require("../streaming/streamConfig");

const CREATOR_PUBLIC_FIELDS = "displayName avatar verified";

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/* Strip secrets/internal fields from a stream (plain object or document). */
function sanitizeStream(stream) {
  if (!stream) return stream;

  const obj =
    typeof stream.toObject === "function"
      ? stream.toObject()
      : { ...stream };

  delete obj.streamKey;
  delete obj.notifyUsers;

  return obj;
}

function sanitizeStreams(streams) {
  return (streams || []).map(sanitizeStream);
}

/*
 * Creator account of the authenticated user (or null). Every creator action
 * resolves ownership through this — never through client-supplied ids.
 */
async function getCreatorForUser(userId) {
  if (!userId) return null;

  return Creator.findOne({ userId });
}

async function loadOwnedStream(req, { includeKey = false } = {}) {
  const creator = await getCreatorForUser(req.user?.id);

  if (!creator) {
    return { error: { status: 403, message: "Creator account required" } };
  }

  if (!isValidObjectId(req.params.id)) {
    return { error: { status: 400, message: "Invalid stream id" } };
  }

  const stream = await LiveStream.findOne({
    _id: req.params.id,
    creatorId: creator._id,
  });

  if (!stream) {
    return { error: { status: 404, message: "Stream not found" } };
  }

  return { stream, creator, includeKey };
}

function sendError(res, status, message) {
  return res.status(status).json({ success: false, message });
}

/*
 * Creator-only: full stream including streamKey plus the ingest setup the
 * Live Studio needs (RTMP URL, HLS template, FFmpeg/config warnings).
 */
function creatorStreamPayload(stream) {
  const obj = sanitizeStream(stream);
  const ingest = getIngestInfo();

  obj.streamKey = stream.streamKey;
  obj.ingest = {
    rtmpUrl: ingest.rtmpUrl,
    hlsUrlTemplate: ingest.hlsUrlTemplate,
    ffmpegReady: ingest.ffmpegReady,
    warnings: ingest.warnings,
  };

  return obj;
}

/*
 * POST /api/live-streams
 * Create a stream (waiting state). Does NOT start broadcasting.
 */
exports.createStream = async (req, res) => {
  try {
    const creator = await getCreatorForUser(req.user?.id);

    if (!creator) {
      return sendError(res, 403, "Creator account required");
    }

    const title = String(req.body.title || "").trim();
    if (!title) {
      return sendError(res, 400, "A stream title is required");
    }

    const stream = await LiveStream.create({
      creatorId: creator._id,
      title,
      description: String(req.body.description || "").trim(),
      category: String(req.body.category || "General").trim(),
      thumbnail: String(req.body.thumbnail || "").trim(),
      streamKey: generateStreamKey(),
      isLive: false,
      isScheduled: false,
      viewers: 0,
    });

    res.status(201).json({
      success: true,
      message:
        "Stream created. It is waiting for a broadcast — this does NOT start " +
        "streaming. Publish from OBS (or any RTMP encoder) with the server URL " +
        "and stream key below; the stream goes live automatically once ingest connects.",
      stream: creatorStreamPayload(stream),
    });
  } catch (err) {
    console.error("createStream error:", err.message);
    sendError(res, 500, "Failed to create stream");
  }
};

/*
 * POST /api/live-streams/schedule
 * Schedule a stream. Still requires RTMP ingest to actually go live.
 */
exports.scheduleStream = async (req, res) => {
  try {
    const creator = await getCreatorForUser(req.user?.id);

    if (!creator) {
      return sendError(res, 403, "Creator account required");
    }

    const title = String(req.body.title || "").trim();
    if (!title) {
      return sendError(res, 400, "A stream title is required");
    }

    const scheduledFor = req.body.scheduledFor
      ? new Date(req.body.scheduledFor)
      : null;

    if (!scheduledFor || Number.isNaN(scheduledFor.getTime())) {
      return sendError(res, 400, "A valid scheduledFor date is required");
    }

    const stream = await LiveStream.create({
      creatorId: creator._id,
      title,
      description: String(req.body.description || "").trim(),
      category: String(req.body.category || "General").trim(),
      thumbnail: String(req.body.thumbnail || "").trim(),
      scheduledFor,
      isScheduled: true,
      isLive: false,
      streamKey: generateStreamKey(),
      viewers: 0,
    });

    res.status(201).json({
      success: true,
      message:
        "Stream scheduled. It goes live only when you start publishing via RTMP " +
        "at the scheduled time.",
      stream: creatorStreamPayload(stream),
    });
  } catch (err) {
    console.error("scheduleStream error:", err.message);
    sendError(res, 500, "Failed to schedule stream");
  }
};

/*
 * GET /api/live-streams/live
 * Public list of live streams. Stream keys are never included.
 */
exports.getLiveStreams = async (req, res) => {
  try {
    const streams = await LiveStream.find({ isLive: true })
      .select("-streamKey -notifyUsers")
      .populate("creatorId", CREATOR_PUBLIC_FIELDS)
      .sort({ viewers: -1 })
      .limit(50);

    res.json(sanitizeStreams(streams));
  } catch (err) {
    console.error("getLiveStreams error:", err.message);
    sendError(res, 500, "Failed to load live streams");
  }
};

/*
 * GET /api/live-streams/discover
 * Public discovery: live now + upcoming. No stream keys, minimal creator data.
 */
exports.getDiscovery = async (req, res) => {
  try {
    const now = new Date();

    const [live, upcoming] = await Promise.all([
      LiveStream.find({ isLive: true })
        .select("-streamKey -notifyUsers")
        .populate("creatorId", CREATOR_PUBLIC_FIELDS)
        .sort({ viewers: -1 })
        .limit(20),
      LiveStream.find({
        isScheduled: true,
        isLive: false,
        scheduledFor: { $gt: now },
      })
        .select("-streamKey -notifyUsers")
        .populate("creatorId", CREATOR_PUBLIC_FIELDS)
        .sort({ scheduledFor: 1 })
        .limit(20),
    ]);

    res.json({
      live: sanitizeStreams(live),
      upcoming: sanitizeStreams(upcoming),
    });
  } catch (err) {
    console.error("getDiscovery error:", err.message);
    sendError(res, 500, "Failed to load discovery");
  }
};

/*
 * GET /api/live-streams/:id
 * Public single-stream view for the player. No stream key.
 */
exports.getStream = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 400, "Invalid stream id");
    }

    const stream = await LiveStream.findById(req.params.id)
      .select("-streamKey -notifyUsers")
      .populate("creatorId", CREATOR_PUBLIC_FIELDS);

    if (!stream) {
      return sendError(res, 404, "Stream not found");
    }

    res.json(sanitizeStream(stream));
  } catch (err) {
    console.error("getStream error:", err.message);
    sendError(res, 500, "Failed to load stream");
  }
};

/*
 * GET /api/live-streams/mine (auth)
 * The creator's own streams, including streamKey and ingest setup.
 */
exports.getMyStreams = async (req, res) => {
  try {
    const creator = await getCreatorForUser(req.user?.id);

    if (!creator) {
      return sendError(res, 403, "Creator account required");
    }

    const streams = await LiveStream.find({ creatorId: creator._id }).sort({
      createdAt: -1,
    });

    res.json(streams.map(creatorStreamPayload));
  } catch (err) {
    console.error("getMyStreams error:", err.message);
    sendError(res, 500, "Failed to load your streams");
  }
};

/*
 * GET /api/live-streams/ingest/:id (auth, owner-only)
 * RTMP server URL + stream key + setup warnings for one stream.
 */
exports.getIngestInfo = async (req, res) => {
  try {
    const loaded = await loadOwnedStream(req);

    if (loaded.error) {
      return sendError(res, loaded.error.status, loaded.error.message);
    }

    res.json(creatorStreamPayload(loaded.stream));
  } catch (err) {
    console.error("getIngestInfo error:", err.message);
    sendError(res, 500, "Failed to load ingest info");
  }
};


/*
 * PATCH /api/live-streams/:id (auth, owner-only)
 * Update title/description/category/thumbnail of a waiting or scheduled
 * stream. Cannot edit a stream that is mid-broadcast.
 */
exports.updateStream = async (req, res) => {
  try {
    const loaded = await loadOwnedStream(req);

    if (loaded.error) {
      return sendError(res, loaded.error.status, loaded.error.message);
    }

    const { stream } = loaded;

    if (stream.isLive) {
      return sendError(res, 409, "Cannot edit a stream while it is live");
    }

    const updates = {};

    if (req.body.title !== undefined) {
      const title = String(req.body.title || "").trim();
      if (!title) return sendError(res, 400, "Title cannot be empty");
      updates.title = title;
    }
    if (req.body.description !== undefined) {
      updates.description = String(req.body.description || "").trim();
    }
    if (req.body.category !== undefined) {
      updates.category = String(req.body.category || "General").trim();
    }
    if (req.body.thumbnail !== undefined) {
      updates.thumbnail = String(req.body.thumbnail || "").trim();
    }

    const updated = await LiveStream.findByIdAndUpdate(
      stream._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json({ success: true, stream: creatorStreamPayload(updated) });
  } catch (err) {
    console.error("updateStream error:", err.message);
    sendError(res, 500, "Failed to update stream");
  }
};

/*
 * PUT /api/live-streams/start/:id (auth, owner-only)
 * Marks a scheduled stream as "open" (no longer upcoming). It does NOT
 * mark the stream live — only real RTMP ingest does (mediaServer
 * postPublish). Kept for backwards compatibility with older clients.
 */
exports.startStream = async (req, res) => {
  try {
    const loaded = await loadOwnedStream(req);

    if (loaded.error) {
      return sendError(res, loaded.error.status, loaded.error.message);
    }

    if (loaded.stream.isLive) {
      return res.json({
        success: true,
        live: true,
        stream: creatorStreamPayload(loaded.stream),
      });
    }

    const stream = await LiveStream.findOneAndUpdate(
      { _id: loaded.stream._id, isLive: false },
      {
        $set: { isScheduled: false },
        $unset: { scheduledFor: 1 },
      },
      { new: true }
    );

    res.json({
      success: true,
      live: false,
      message:
        "Stream is open and waiting. It goes live automatically once your RTMP " +
        "encoder starts publishing with this stream's key.",
      stream: creatorStreamPayload(stream),
    });
  } catch (err) {
    console.error("startStream error:", err.message);
    sendError(res, 500, "Failed to start stream");
  }
};

/*
 * PUT /api/live-streams/end/:id (auth, owner-only)
 * Ends a stream: isLive=false, endedAt set, viewers zeroed. Idempotent —
 * ending an already-ended stream succeeds without changing endedAt.
 */
exports.endStream = async (req, res) => {
  try {
    const loaded = await loadOwnedStream(req);

    if (loaded.error) {
      return sendError(res, loaded.error.status, loaded.error.message);
    }

    if (!loaded.stream.isLive && loaded.stream.endedAt) {
      // Already ended; return current state without mutating.
      return res.json({
        success: true,
        alreadyEnded: true,
        stream: creatorStreamPayload(loaded.stream),
      });
    }

    const stream = await LiveStream.findOneAndUpdate(
      { _id: loaded.stream._id },
      {
        $set: {
          isLive: false,
          isScheduled: false,
          endedAt: new Date(),
          viewers: 0,
        },
      },
      { new: true }
    );

    res.json({ success: true, stream: creatorStreamPayload(stream) });
  } catch (err) {
    console.error("endStream error:", err.message);
    sendError(res, 500, "Failed to end stream");
  }
};

/* Exported for regression tests (Phase 29). */
exports.sanitizeStream = sanitizeStream;
exports.sanitizeStreams = sanitizeStreams;
exports.CREATOR_PUBLIC_FIELDS = CREATOR_PUBLIC_FIELDS;
