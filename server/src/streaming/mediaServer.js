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
const { getIngestInfo, resolveHlsBaseUrl } = require("./streamConfig");
const {
  startPackaging,
  stopPackaging,
  stopAll,
  isPlaybackReady,
} = require("./hlsPackager");

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

/* Phase 31.1: canonical media root — server/media regardless of cwd.
 * Previously MEDIA_ROOT defaulted to process.cwd()/media, so launching from
 * the repo root vs server/ split ingest output from the static routes and
 * produced 404s for playlists that existed on disk. */
const DEFAULT_MEDIA_ROOT = path.resolve(__dirname, "..", "..", "media");
const mediaRoot =
  (process.env.MEDIA_ROOT || DEFAULT_MEDIA_ROOT);

/* Phase 31.1: HLS static delivery. NMS v4's http server only handles FLV —
 * it never served the FFmpeg-written m3u8/TS files, so LAN playback 404'd
 * even though the playlist existed on disk. Serve MEDIA_ROOT/live on
 * MEDIA_PORT+1 via express with correct HLS/TS content types and CORS.
 * Binds 0.0.0.0 so phone LAN URLs reach it. Serves HLS files only. */
const HLS_PORT_OFFSET = 1;
let hlsStaticServer = null;
function startHlsStaticServer() {
  if (hlsStaticServer) return hlsStaticServer;
  try {
    const express = require("express");
    const app = express();
    app.use((req, res, next) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type");
      if (req.method === "OPTIONS") return res.sendStatus(204);
      next();
    });
    app.use("/live", express.static(path.join(mediaRoot, "live"), {
      fallthrough: true,
      setHeaders(res, filePath) {
        if (filePath.endsWith(".m3u8")) {
          res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        } else if (filePath.endsWith(".ts")) {
          res.setHeader("Content-Type", "video/mp2t");
          res.setHeader("Cache-Control", "public, max-age=60");
        }
      },
    }));
    app.use("/live", (req, res) => res.status(404).send("not found"));
    const port = (Number(process.env.MEDIA_PORT) || 8000) + HLS_PORT_OFFSET;
    const host = process.env.MEDIA_BIND || "0.0.0.0";
    hlsStaticServer = app.listen(port, host, () => {
      console.log(`[live][hls] static server on http://${host}:${port}/live/<key>/index.m3u8 (root ${mediaRoot})`);
    });
    hlsStaticServer.on("error", (err) => {
      console.error("[live][hls] static server error:", err.message);
    });
  } catch (err) {
    console.error("[live][hls] static server failed to start:", err.message);
  }
  return hlsStaticServer;
}
/* Phase 31.1: HLS base URL — dev/LAN serves from the static server on
 * MEDIA_PORT+1 (bump an explicit :8000 -> :8001). Phase 33: a portless
 * public URL (e.g. a Railway HTTPS domain) is NEVER given an internal
 * port — the main Express API serves /live on the public domain itself.
 * The RTMP ingest key is never embedded anywhere else — playback URLs
 * carry only the path; the key stays server-side. */
function hlsBaseUrl() {
  const mediaPort = Number(process.env.MEDIA_PORT) || 8000;
  return resolveHlsBaseUrl(ingest.mediaBaseUrl, mediaPort);
}
/* NOTE: startHlsStaticServer is exported at the bottom with the other
 * exports (after `nms` exists) — do NOT export here; `module.exports = nms`
 * below would wipe early assignments. */

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

/* Phase 30.5 finding: node-media-server v4 has NO ffmpeg/transcode consumer —
 * the `trans` config block is inert (no transcode server exists in v4 src)
 * and the record server only writes raw .flv when `record.path` is set
 * (record_server.js). Our config sets neither, so no MP4 is ever produced
 * and finalizeRecording honestly reports "no-recording-file" (cleanup
 * unaffected, by design). Enablement is a future explicit step:
 * set NMS_RECORD_PATH + record.path, after which findRecording probes the
 * "<record.path>/live/<key>/<ts>.flv" layout. HLS likewise needs an
 * external packager — postPublish advertises the playback URL template,
 * but no segments exist until one is wired. */
const config = {
  /* Phase 33: bind interface for RTMP (+NMS HTTP) made explicit so RTMP
   * ingest listens on 0.0.0.0:1935 inside the container — reachable by a
   * Railway TCP proxy (loopback-only would make proxying impossible).
   * Override with MEDIA_BIND only for specialised local setups. */
  bind: process.env.MEDIA_BIND || "0.0.0.0",
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
/* Phase 30.6: ended streams can never be republished with their old key.
 * prePublish accepts a key ONLY when its owning document is not ended
 * (no endedAt). An ended stream's key is dead — the creator must create a
 * new stream (new key) to go live again. */
  try {
    const existing = await LiveStream.findOne({ streamKey }).select("_id endedAt");
    if (!existing) {
      console.warn(`[live] prePublish: unknown stream key ${redactKey(streamKey)}; publisher rejected`);
      rejectSession(session);
    } else if (existing.endedAt) {
      console.warn(`[live] prePublish: key ${redactKey(streamKey)} belongs to ended stream ${existing._id}; republish rejected`);
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
    /* Phase 30.6: an ended stream's key is dead — a late/duplicate publisher
     * attaching with it must NEVER resurrect the stream. */
    if (stream.endedAt) {
      console.warn(`[live] postPublish: key ${redactKey(streamKey)} belongs to ended stream ${stream._id}; ignoring (key retired)`);
      rejectSession(null);
      return;
    }

    const result = await LiveStream.updateOne(
      { _id: stream._id, endedAt: null },
      {
        $set: {
          isLive: true,
          startedAt: stream.startedAt || new Date(),
          endedAt: null,
          playbackUrl: `${hlsBaseUrl()}/live/${streamKey}/index.m3u8`,
          /* Phase 31.1: playbackUrl always targets the HLS static server
           * (MEDIA_PORT+1); legacy MEDIA_BASE_URL values pointing at the NMS
           * FLV port would otherwise 404. hlsBaseUrl() normalizes. */
          playbackStatus: ingest.ffmpegReady ? "preparing" : "failed",
          playbackError: ingest.ffmpegReady
            ? ""
            : "FFmpeg unavailable — viewers cannot watch until FFmpeg is installed.",
          publisherHeartbeatAt: new Date(),
          mobileSessionActive: stream.publisherSource === "mobile" ? true : stream.mobileSessionActive,
          publisherSource: stream.publisherSource === "mobile" ? "mobile" : "external",
        },
      }
    );

    /* Phase 31: start real HLS packaging now that ingest is attached.
     * Failure is recorded honestly (playbackStatus=failed) — never fake. */
    if (ingest.ffmpegReady) {
      const started = startPackaging({
        streamKey,
        mediaRoot,
        ffmpegPath: ingest.ffmpegPath,
      });
      if (!started.started && !started.alreadyRunning) {
        await LiveStream.updateOne(
          { _id: stream._id },
          {
            $set: {
              playbackStatus: "failed",
              playbackError: `HLS packaging failed to start (${started.reason}).`,
            },
          }
        );
        console.warn(`[live][hls] packaging failed to start ...${redactKey(streamKey)}: ${started.reason}`);
      }
    }

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
          playbackStatus: "ended",
        },
      },
      { new: true }
    );

    if (!stream) return;

    /* Phase 31: stop this stream's packager only (never another stream's).
     * The key is retired on donePublish, so remove its HLS files. */
    stopPackaging(streamKey, { removeFiles: true });

    /* Phase 30.5: attribute the drop — donePublish with a still-fresh
     * heartbeat means the socket died underneath a healthy session
     * (network/NMS-side), not a client-initiated end. Key redacted. */
    const hbAgeMs = stream.publisherHeartbeatAt
      ? Date.now() - new Date(stream.publisherHeartbeatAt).getTime()
      : -1;
    const hbNote = hbAgeMs >= 0 && hbAgeMs < 30000
      ? `heartbeat ${Math.round(hbAgeMs / 1000)}s ago (socket drop under healthy session?)`
      : `last heartbeat ${hbAgeMs >= 0 ? `${Math.round(hbAgeMs / 1000)}s ago` : "never"}`;
    console.log(`[live] ENDED: ${stream.title} (${stream._id}); key ${redactKey(streamKey)}; ${hbNote}`);

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
  stopAll();
  const result = await LiveStream.updateMany(
    { isLive: true },
    {
      $set: {
        isLive: false,
        endedAt: new Date(),
        viewers: 0,
        mobileSessionActive: false,
        playbackStatus: "ended",
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
module.exports.mediaRoot = mediaRoot;
module.exports.ingestInfo = ingest;
module.exports.isPlaybackReady = (streamKey) => isPlaybackReady(mediaRoot, streamKey);
module.exports.playbackPath = (streamKey) =>
  require("./hlsPackager").playlistPath(mediaRoot, streamKey);
module.exports.stopPackaging = stopPackaging;
/* Phase 30.4: parser/test seam (no secrets). */
module.exports.resolveStreamPath = resolveStreamPath;
module.exports.extractStreamKey = extractStreamKey;
module.exports.redactKey = redactKey;
module.exports.rejectSession = rejectSession;

module.exports.startHlsStaticServer = startHlsStaticServer;
module.exports.hlsStaticPort = () => (Number(process.env.MEDIA_PORT) || 8000) + HLS_PORT_OFFSET;
/* Phase 31.1: auto-start the HLS static server on require (when this module
 * is the live media server). Test seams that require this file get delivery
 * too; startHlsStaticServer is idempotent. Disable with HLS_STATIC=0. */
if (process.env.HLS_STATIC !== "0") {
  try { startHlsStaticServer(); } catch (_e) { /* logged inside */ }
}
/* Phase 31: graceful shutdown stops packagers (never orphan ffmpeg). */
for (const sig of ["SIGINT", "SIGTERM"]) {
  try {
    process.on(sig, () => {
      try { stopAll(); } catch (_e) { /* ignore */ }
      try { if (hlsStaticServer) hlsStaticServer.close(); } catch (_e) { /* ignore */ }
    });
  } catch (_e) { /* ignore */ }
}

/* Phase 31: honest playback state for the readiness endpoint.
 * Never marks playable unless playlist + segments exist on disk. */
function getPlaybackState(stream) {
  const out = {
    playbackStatus: stream.playbackStatus || "preparing",
    playbackError: stream.playbackError || "",
    playbackReady: false,
  };
  if (stream.endedAt || stream.playbackStatus === "ended") {
    out.playbackStatus = "ended";
    out.playbackError = "";
    return out;
  }
  if (!stream.isLive) return out;
  /* Phase 31.1: a dead ffmpeg must surface as failed (with its sanitized
   * stderr tail) instead of preparing forever. */
  try {
    const { describePackagingFailure } = require("./hlsPackager");
    const failure = describePackagingFailure(stream.streamKey);
    if (failure) {
      out.playbackStatus = "failed";
      out.playbackError = failure;
      if (stream.playbackStatus !== "failed") {
        LiveStream.updateOne(
          { _id: stream._id },
          { $set: { playbackStatus: "failed", playbackError: failure } }
        ).catch(() => {});
      }
      return out;
    }
  } catch (_e) { /* ignore — fall through to disk probe */ }
  if (stream.playbackStatus === "failed") return out;
  const probe = isPlaybackReady(mediaRoot, stream.streamKey);
  out.playbackReady = probe.ready;
  if (probe.ready) {
    out.playbackStatus = "playable";
    if (stream.playbackStatus !== "playable") {
      LiveStream.updateOne(
        { _id: stream._id },
        { $set: { playbackStatus: "playable" } }
      ).catch(() => {});
    }
  } else {
    out.playbackStatus = "preparing";
  }
  return out;
}

module.exports.getPlaybackState = getPlaybackState;
