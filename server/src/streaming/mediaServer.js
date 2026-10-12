"use strict";
/*
 * Phase 29 — canonical live media server (RTMP ingest -> HLS playback).
 *
 * Architecture (unchanged, made reliable):
 *   OBS/RTMP encoder --RTMP--> NodeMediaServer --FFmpeg--> HLS (m3u8)
 *
 * The phone cannot broadcast directly; creators publish with an external
 * RTMP encoder using the server URL + stream key from the Live Studio.
 */
const path = require("path");

const mongoose = require("mongoose");
const NodeMediaServer = require("node-media-server");

const Media = require("../models/Media");
const LiveStream = require("../models/LiveStream");
const uploadRecordedVideo = require("../utils/uploadRecordedVideo");
const { finalizeRecording } = require("./recordingProcessor");
const { getIngestInfo } = require("./streamConfig");

const ingest = getIngestInfo();

if (!ingest.mediaBaseUrl) {
  throw new Error(
    "FATAL: MEDIA_BASE_URL must be set in production and must point to the public media server URL."
  );
}

if (!ingest.ffmpegReady) {
  console.warn(
    "[live] WARNING: FFmpeg not available — RTMP ingest will accept broadcasts but HLS " +
      "playback and recordings are disabled. Install FFmpeg and set FFMPEG_PATH."
  );
}

for (const warning of ingest.warnings) {
  if (!warning.startsWith("FFmpeg")) console.warn(`[live] ${warning}`);
}

const mediaRoot =
  (process.env.MEDIA_ROOT || path.join(process.cwd(), "media"));

const trans = ingest.ffmpegPath
  ? {
      ffmpeg: ingest.ffmpegPath,
      tasks: [
        {
          app: "live",
          hls: true,
          hlsFlags: "[hls_time=2:hls_list_size=5:hls_flags=delete_segments]",
          mp4: true,
          mp4Flags: "[movflags=faststart]",
        },
      ],
    }
  : undefined;

const config = {
  rtmp: {
    port: Number(process.env.RTMP_PORT) || 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60,
  },

  http: {
    port: Number(process.env.MEDIA_PORT) || 8000,
    mediaroot: mediaRoot,
    allow_origin:
      process.env.NODE_ENV === "production"
        ? (process.env.ALLOWED_ORIGINS || "").split(",")[0] || "*"
        : "*",
  },

  ...(trans ? { trans } : {}),
};

const nms = new NodeMediaServer(config);

function resolveStreamPath(first, second) {
  // NMS v4 emits a SINGLE session object: emit("prePublish", session) with
  // session.streamPath === "/live/<streamKey>" (see broadcast_server.js and
  // index.js on(eventName, (session) => void)). Older docs describe
  // (id, StreamPath, args); accept a legacy string second arg too, but the
  // session object's streamPath is authoritative — never a session id.
  if (first && typeof first === "object" && typeof first.streamPath === "string" && first.streamPath) {
    return { path: first.streamPath, session: first };
  }
  if (typeof second === "string" && second) {
    return { path: second, session: first && typeof first === "object" ? first : null };
  }
  if (typeof first === "string" && first) {
    return { path: first, session: null };
  }
  return { path: "", session: first && typeof first === "object" ? first : null };
}

function redactKey(key) {
  return key ? `...${String(key).slice(-4)}` : "(missing)";
}

function extractStreamKey(streamPath) {
  // Require exactly "/live/<key>": two non-empty segments, app "live",
  // 48-char hex key (generateStreamKey = 24 random bytes as hex). Returns the
  // COMPLETE key or null — never a truncated/partial value.
  const parts = String(streamPath || "").split("/").filter(Boolean);
  if (parts.length !== 2) return null;
  if (parts[0] !== "live") return null;
  if (!/^[0-9a-f]{48}$/i.test(parts[1])) return null;
  return parts[1];
}

function rejectSession(session) {
  // NMS v4 sessions expose no reject(): close the socket to refuse publish.
  try {
    if (session && typeof session.close === "function") session.close();
    else if (session && session.socket && typeof session.socket.end === "function") session.socket.end();
  } catch (_err) { /* ignore */ }
}

/* Stream Started (authoritative "live" signal: a publisher is attached).
 * Phase 30.4: NMS v4 emits ONE session object (not (id, path)); the key comes
 * from session.streamPath. Diagnostics are single-line per outcome, key
 * redacted. Validation stays enforced. */
nms.on("prePublish", async (first, second) => {
  const { path: streamPath, session } = resolveStreamPath(first, second);
  const streamKey = extractStreamKey(streamPath);
  if (!streamKey) {
    console.warn(`[live] prePublish: malformed stream path; rejecting (path segments rejected)`);
    rejectSession(session);
    return;
  }
  try {
    const exists = await LiveStream.exists({ streamKey });
    if (!exists) {
      console.warn(`[live] prePublish: unknown stream key ${redactKey(streamKey)}; publisher rejected`);
      rejectSession(session);
    } else {
      console.log(`[live] prePublish: key ${redactKey(streamKey)} accepted; awaiting postPublish`);
    }
  } catch (err) {
    console.error("[live] prePublish error:", err.message);
  }
});

nms.on("postPublish", async (first, second) => {
  const { path: streamPath } = resolveStreamPath(first, second);
  const streamKey = extractStreamKey(streamPath);
  if (!streamKey) {
    console.warn("[live] postPublish: malformed stream path; cannot mark live");
    return;
  }

  try {
    const stream = await LiveStream.findOne({ streamKey });
    if (!stream) {
      console.warn(`[live] postPublish: unknown stream key ${redactKey(streamKey)}; no document updated`);
      return;
    }

    const result = await LiveStream.updateOne(
      { _id: stream._id },
      {
        $set: {
          isLive: true,
          startedAt: stream.startedAt || new Date(),
          endedAt: null,
          playbackUrl: `${ingest.mediaBaseUrl}/live/${streamKey}/index.m3u8`,
          publisherHeartbeatAt: new Date(),
          mobileSessionActive: stream.publisherSource === "mobile" ? true : stream.mobileSessionActive,
          publisherSource: stream.publisherSource === "mobile" ? "mobile" : "external",
        },
      }
    );

    console.log(`[live] LIVE: ${stream.title} (${stream._id}); key ${redactKey(streamKey)} matched=${result.matchedCount} modified=${result.modifiedCount}`);
  } catch (err) {
    console.error("[live] postPublish error:", err.message);
  }
});

/* Stream Ended */
nms.on("donePublish", async (first, second) => {
  const { path: streamPath } = resolveStreamPath(first, second);
  const streamKey = extractStreamKey(streamPath);
  if (!streamKey) {
    console.warn("[live] donePublish: malformed stream path; nothing to end");
    return;
  }

  try {
    const stream = await LiveStream.findOneAndUpdate(
      { streamKey },
      {
        $set: {
          isLive: false,
          endedAt: new Date(),
          viewers: 0,
          mobileSessionActive: false,
        },
      },
      { new: true }
    );

    if (!stream) return;

    console.log(`[live] ENDED: ${stream.title} (${stream._id})`);

    // Tell everyone in the chat room the broadcast stopped.
    try {
      const { notifyStreamEnded } = require("../socket");
      notifyStreamEnded(String(stream._id));
    } catch (_err) {
      /* socket layer unavailable (e.g. tests) — safe to skip */
    }

    // Archive the recording. Failures here must NOT affect stream cleanup.
    await finalizeRecording({
      streamKey,
      stream,
      mediaRoot,
      uploadRecordedVideo,
      Media,
    });
  } catch (err) {
    console.error("[live] donePublish error:", err.message);
  }
});

/*
 * Reconcile stale sessions: any stream still flagged live when the process
 * (and therefore the media server) starts cannot actually have a publisher —
 * the previous process died or the stream was left open. Mark them ended so
 * discovery and viewers never see ghost live streams.
 */
async function reconcileStaleLiveStreams() {
  const result = await LiveStream.updateMany(
    { isLive: true },
    {
      $set: {
        isLive: false,
        endedAt: new Date(),
        viewers: 0,
        mobileSessionActive: false,
      },
    }
  );

  if (result.modifiedCount > 0) {
    console.warn(
      `[live] reconciled ${result.modifiedCount} stale live session(s) after restart`
    );
  }

  return result.modifiedCount;
}

/* Wait (patiently) for MongoDB before reconciling; index.js connects async. */
function scheduleReconciliation(attemptsLeft = 30, delayMs = 2000) {
  setTimeout(() => {
    if (mongoose.connection.readyState === 1) {
      reconcileStaleLiveStreams().catch((err) =>
        console.error("[live] stale reconciliation failed:", err.message)
      );
      return;
    }

    if (attemptsLeft <= 1) {
      console.warn("[live] skipping stale-session reconciliation: database never connected");
      return;
    }

    scheduleReconciliation(attemptsLeft - 1, delayMs);
  }, delayMs);
}

scheduleReconciliation();

module.exports = nms;
module.exports.reconcileStaleLiveStreams = reconcileStaleLiveStreams;
/* Phase 30.4: parser/test seam (no secrets). */
module.exports.resolveStreamPath = resolveStreamPath;
module.exports.extractStreamKey = extractStreamKey;
module.exports.redactKey = redactKey;
module.exports.rejectSession = rejectSession;
