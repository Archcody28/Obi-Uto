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

function streamKeyFromPath(streamPath) {
  // Stream path looks like "/live/<streamKey>"
  const parts = String(streamPath || "").split("/").filter(Boolean);
  return parts.length >= 2 ? parts[1] : null;
}

/* Stream Started (authoritative "live" signal: a publisher is attached). */
nms.on("prePublish", async (_id, streamPath) => {
  const streamKey = streamKeyFromPath(streamPath);
  if (!streamKey) return;
  try {
    const exists = await LiveStream.exists({ streamKey });
    if (!exists) {
      const session = nms.getSession(_id);
      if (session && typeof session.reject === "function") session.reject();
    }
  } catch (err) {
    console.error("[live] prePublish error:", err.message);
  }
});

nms.on("postPublish", async (_id, streamPath) => {
  const streamKey = streamKeyFromPath(streamPath);
  if (!streamKey) return;

  try {
    const stream = await LiveStream.findOne({ streamKey });
    if (!stream) {
      console.warn(`[live] publish attempt with unknown stream key; rejected (no matching stream)`);
      return;
    }

    await LiveStream.updateOne(
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

    console.log(`[live] LIVE: ${stream.title} (${stream._id})`);
  } catch (err) {
    console.error("[live] postPublish error:", err.message);
  }
});

/* Stream Ended */
nms.on("donePublish", async (_id, streamPath) => {
  const streamKey = streamKeyFromPath(streamPath);
  if (!streamKey) return;

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
