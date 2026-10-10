"use strict";
/*
 * Phase 29 — environment-derived streaming configuration.
 *
 * Central place that resolves the RTMP ingest URL, the HLS/media base URL and
 * a usable FFmpeg binary. No LAN IP and no OS-specific hardcoding: values come
 * from the environment first, then from portable fallbacks.
 *
 *   RTMP_PUBLIC_URL  Publicly reachable RTMP ingest URL (rtmp://host:1935).
 *   PUBLIC_HOST      Hostname used to derive the RTMP URL when
 *                    RTMP_PUBLIC_URL is not set.
 *   MEDIA_BASE_URL   Publicly reachable media/HLS base URL (required in
 *                    production, e.g. https://cdn.example.com or
 *                    https://api.example.com:8000).
 *   MEDIA_PORT       HTTP port for the NodeMediaServer media server
 *                    (default 8000).
 *   RTMP_PORT        RTMP ingest port (default 1935).
 *   FFMPEG_PATH      Absolute path to ffmpeg. When unset we probe a small
 *                    list of portable locations and otherwise report the
 *                    media pipeline as disabled instead of guessing.
 */
const fs = require("fs");

const DEFAULT_RTMP_PORT = 1935;
const DEFAULT_MEDIA_PORT = 8000;

const FFMPEG_CANDIDATES = {
  win32: ["C:\\ffmpeg\\bin\\ffmpeg.exe"],
  default: ["/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg", "/opt/homebrew/bin/ffmpeg"],
};

function stripTrailingSlashes(url) {
  return String(url).replace(/\/+$/, "");
}

function hostFromUrl(url) {
  try {
    // hostname only — a MEDIA_BASE_URL port must not leak into the RTMP URL.
    return new URL(url).hostname;
  } catch (_err) {
    return "";
  }
}

function resolveMediaBaseUrl(env = process.env) {
  const configured = (env.MEDIA_BASE_URL || "").trim();
  if (configured) return stripTrailingSlashes(configured);

  if ((env.NODE_ENV || "").toLowerCase() === "production") return null;

  // Development-only fallback: localhost, never a developer LAN address.
  return `http://localhost:${Number(env.MEDIA_PORT) || DEFAULT_MEDIA_PORT}`;
}

function resolveRtmpUrl(env = process.env) {
  const configured = (env.RTMP_PUBLIC_URL || "").trim();
  if (configured) return stripTrailingSlashes(configured);

  const mediaBase = (env.MEDIA_BASE_URL || "").trim();
  const host =
    (env.PUBLIC_HOST || "").trim() ||
    hostFromUrl(mediaBase) ||
    "localhost";
  const port = Number(env.RTMP_PORT) || DEFAULT_RTMP_PORT;

  return `rtmp://${host}:${port}`;
}

function resolveFfmpegPath(env = process.env, existsSync = fs.existsSync) {
  const configured = (env.FFMPEG_PATH || "").trim();
  if (configured) {
    // Trust explicit configuration even when this process cannot see the
    // file (e.g. the app runs in a container/CI image that has it).
    return configured;
  }

  const candidates = FFMPEG_CANDIDATES[process.platform] || FFMPEG_CANDIDATES.default;
  for (const candidate of candidates) {
    try {
      if (existsSync(candidate)) return candidate;
    } catch (_err) {
      /* ignore probe errors */
    }
  }

  return null;
}

function getIngestInfo(env = process.env, existsSync = fs.existsSync) {
  const warnings = [];

  const mediaBaseUrl = resolveMediaBaseUrl(env);
  if (!mediaBaseUrl) {
    warnings.push(
      "MEDIA_BASE_URL must be set in production so viewers can reach the HLS playback URL."
    );
  }

  const ffmpegPath = resolveFfmpegPath(env, existsSync);
  if (!ffmpegPath) {
    warnings.push(
      "FFmpeg was not found. Set FFMPEG_PATH to a valid ffmpeg binary to enable HLS playback and recordings. RTMP ingest will accept broadcasts, but viewers cannot watch until FFmpeg is available."
    );
  }

  const rtmpUrl = resolveRtmpUrl(env);
  const hlsUrlTemplate = mediaBaseUrl ? `${mediaBaseUrl}/live/{streamKey}/index.m3u8` : "";

  return {
    ready: Boolean(mediaBaseUrl && ffmpegPath),
    rtmpUrl,
    mediaBaseUrl: mediaBaseUrl || "",
    hlsUrlTemplate,
    ffmpegPath: ffmpegPath || "",
    ffmpegReady: Boolean(ffmpegPath),
    warnings,
  };
}

module.exports = {
  DEFAULT_RTMP_PORT,
  DEFAULT_MEDIA_PORT,
  resolveMediaBaseUrl,
  resolveRtmpUrl,
  resolveFfmpegPath,
  getIngestInfo,
};
