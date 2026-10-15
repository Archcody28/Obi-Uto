"use strict";
/*
 * Phase 29 — environment-derived streaming configuration.
 *
 * Central place that resolves the RTMP ingest URL, the HLS/media base URL and
 * a usable FFmpeg binary. No LAN IP and no OS-specific hardcoding: values come
 * from the environment first, then from portable fallbacks.
 *
 *   RTMP_PUBLIC_URL  Publicly reachable RTMP ingest URL (rtmp://host:port).
 *                    REQUIRED in production — use the platform's TCP-proxy
 *                    hostname/port (e.g. Railway TCP proxy). The publisher
 *                    appends /live/<streamKey> itself.
 *   PUBLIC_HOST      Hostname used to derive the RTMP URL when
 *                    RTMP_PUBLIC_URL is not set (works in production too;
 *                    combine with RTMP_PORT for a non-default proxy port).
 *   MEDIA_BASE_URL   Publicly reachable media/HLS base URL (required in
 *                    production, e.g. https://cdn.example.com or the
 *                    Railway service domain — NO internal ports).
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

function stripLiveSuffix(url) {
  // Operators sometimes configure RTMP_PUBLIC_URL OBS-style with a trailing
  // "/live" (e.g. rtmp://host:1935/live). The publisher always appends
  // "/live/<streamKey>" itself, so a lingering suffix would produce
  // ".../live/live/<key>" and the ingest key parser would reject it.
  return String(url).replace(/\/(live(?:\/live)*)\/*$/i, "");
}

function isProductionEnv(env) {
  return String(env.NODE_ENV || "").toLowerCase() === "production";
}

function resolveRtmpUrl(env = process.env) {
  const configured = (env.RTMP_PUBLIC_URL || "").trim();
  if (configured) return stripLiveSuffix(stripTrailingSlashes(configured));

  const explicitHost = (env.PUBLIC_HOST || "").trim();
  const host = explicitHost || hostFromUrl((env.MEDIA_BASE_URL || "").trim());
  const port = Number(env.RTMP_PORT) || DEFAULT_RTMP_PORT;

  /* Production must never guess the ingest endpoint: localhost is not
   * reachable by creators and the HTTPS media/API host does not carry the
   * RTMP TCP proxy. Platforms (e.g. Railway) deliver RTMP through a TCP
   * proxy whose host:port must be configured via RTMP_PUBLIC_URL — or, less
   * commonly, PUBLIC_HOST + RTMP_PORT. Until then report an empty URL so the
   * caller can surface an actionable warning instead of a broken default. */
  if (isProductionEnv(env) && !explicitHost) return "";

  return `rtmp://${host || "localhost"}:${port}`;
}

/* Resolve the public base URL that HLS playlists/segments are served from.
 *
 * - Explicit media port (dev/LAN, e.g. http://host:8000) remaps to the
 *   dedicated HLS static port (MEDIA_PORT+1, e.g. :8001) — Phase 31.1.
 * - A URL with NO explicit port (production HTTPS, e.g. a Railway domain)
 *   is returned untouched: the main Express API serves /live on that
 *   domain, and an internal port such as 8001 must never be appended to a
 *   public HTTPS URL (it is unreachable from outside the container).
 */
function resolveHlsBaseUrl(mediaBaseUrl, mediaPort = DEFAULT_MEDIA_PORT) {
  const base = String(mediaBaseUrl || "").replace(/\/+$/, "");
  if (!base) return "";
  const m = base.match(/^(https?:\/\/[^/:]+)(?::(\d+))?(\/.*)?$/i);
  if (!m) return base;
  const [, origin, port, rest] = m;
  if (port && Number(port) === Number(mediaPort)) {
    return `${origin}:${Number(mediaPort) + 1}${rest || ""}`;
  }
  return base;
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
  if (!rtmpUrl) {
    warnings.push(
      "RTMP ingest URL is not configured. Set RTMP_PUBLIC_URL to the public RTMP endpoint provided by your host (e.g. rtmp://<tcp-proxy-host>:<tcp-proxy-port> for a Railway TCP proxy) so creators can publish."
    );
  }
  /* Phase 31.1: HLS is served by the dedicated static server on
   * MEDIA_PORT+1 in dev/LAN (NMS :8000 only speaks FLV). In production the
   * public HTTPS domain serves /live directly — resolveHlsBaseUrl never
   * appends an internal port to a portless (default 443) URL. */
  const mediaPort = Number(env.MEDIA_PORT) || DEFAULT_MEDIA_PORT;
  const hlsBase = resolveHlsBaseUrl(mediaBaseUrl, mediaPort);
  const hlsUrlTemplate = hlsBase ? `${hlsBase}/live/{streamKey}/index.m3u8` : "";

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
  resolveHlsBaseUrl,
  resolveFfmpegPath,
  getIngestInfo,
};
