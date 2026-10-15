"use strict";
/* Phase 31 — real RTMP-to-HLS packaging (per-stream FFmpeg).
 * NMS v4 has NO transcode consumer; this pulls RTMP back off localhost
 * and writes <mediaRoot>/live/<key>/index.m3u8 served by NMS http server.
 */
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const KEY_RE = /^[0-9a-f]{48}$/i;
const active = new Map();

function isValidKey(key) {
  return KEY_RE.test(String(key || ""));
}
function streamDir(mediaRoot, streamKey) {
  return path.join(String(mediaRoot), "live", String(streamKey));
}
function playlistPath(mediaRoot, streamKey) {
  return path.join(streamDir(mediaRoot, streamKey), "index.m3u8");
}
function rtmpPort() {
  return Number(process.env.RTMP_PORT) || 1935;
}
function buildArgs({ ffmpegInput, outDir, playlist }) {
  return [
    "-hide_banner", "-loglevel", "warning",
    /* Phase 31.1: phone RTMP often starts audio-only; the H264 track joins
     * seconds later once the encoder/camera spins up. Wait for video instead
     * of locking an audio-only program in the first probe. */
    "-analyzeduration", "8000000", "-probesize", "8000000",
    "-fflags", "+igndts+genpts",
    "-rtmp_live", "live",
    "-i", ffmpegInput,
    /* Explicit map: keep the FIRST video + FIRST audio when present.
     * With -vsync/-async handled by the HLS muxer; dropping -map let
     * ffmpeg pick audio-only when video arrived late (the field finding). */
    "-map", "0:v:0?", "-map", "0:a:0?",
    "-c:v", "libx264", "-preset", "veryfast", "-tune", "zerolatency",
    "-pix_fmt", "yuv420p", "-profile:v", "baseline", "-level", "3.1",
    "-r", "30", "-g", "60", "-keyint_min", "60",
    "-c:a", "aac", "-ar", "44100", "-ac", "1", "-b:a", "64k",
    "-f", "hls", "-hls_time", "2", "-hls_list_size", "6",
    "-hls_flags", "delete_segments+append_list+independent_segments",
    "-hls_segment_filename", path.join(outDir, "seg-%05d.ts"),
    "-master_pl_name", "index.m3u8",
    playlist,
  ];
}
function startPackaging(o) {
  const { streamKey, mediaRoot, ffmpegPath, spawnFn, logger } = o || {};
  const run = spawnFn || spawn;
  const log = logger || console;
  if (!isValidKey(streamKey)) return { started: false, reason: "invalid-key" };
  if (active.has(streamKey)) return { started: false, alreadyRunning: true };
  if (!mediaRoot) return { started: false, reason: "missing-media-root" };
  if (!ffmpegPath) return { started: false, reason: "ffmpeg-unavailable" };
  try {
    if (!fs.existsSync(ffmpegPath)) return { started: false, reason: "ffmpeg-unavailable" };
  } catch (_e) { return { started: false, reason: "ffmpeg-unavailable" }; }
  const outDir = streamDir(mediaRoot, streamKey);
  const playlist = playlistPath(mediaRoot, streamKey);
  try { fs.mkdirSync(outDir, { recursive: true }); }
  catch (err) { return { started: false, reason: "mkdir-failed" }; }
  const input = "rtmp://127.0.0.1:" + rtmpPort() + "/live/" + streamKey;
  const args = buildArgs({ ffmpegInput: input, outDir, playlist });
  let child = null;
  /* Phase 31.1: capture ffmpeg stderr (ring buffer) so an audio-only or
   * failing ingest leaves an actionable diagnostic instead of silence. */
  const errRing = [];
  const STDERR_ARGS = ["-hide_banner", "-loglevel", "warning"];
  const logArgs = Array.isArray(args) ? args.filter((a) => !STDERR_ARGS.includes(a)) : args;
  try { child = run(ffmpegPath, args, { stdio: ["ignore", "ignore", "pipe"], windowsHide: true }); }
  catch (err) { return { started: false, reason: "spawn-failed" }; }
  if (!child || !child.pid) return { started: false, reason: "spawn-failed" };
  try {
    if (child.stderr && typeof child.stderr.on === "function") {
      child.stderr.on("data", (d) => {
        errRing.push(String(d));
        if (errRing.length > 20) errRing.shift();
      });
    }
  } catch (_e) { /* ignore */ }
  const entry = { child, status: "starting", error: "", startedAt: new Date(), playlist, outDir, errRing, ffmpegArgs: logArgs };
  active.set(streamKey, entry);
  log.log("[live][hls] packaging started for ..." + String(streamKey).slice(-4));
  child.on("error", (err) => {
    entry.status = "failed";
    entry.error = String((err && err.message) || err);
    log.error("[live][hls] ffmpeg error ..." + String(streamKey).slice(-4) + ": " + entry.error);
  });
  child.on("exit", (code, signal) => {
    if (active.get(streamKey) === entry && entry.status !== "stopped") {
      entry.status = "failed";
      const tail = (entry.errRing || []).join("").slice(-500);
      entry.error = "ffmpeg exited code=" + code + " signal=" + (signal || "none") + (tail ? " :: " + tail : "");
      log.warn("[live][hls] ffmpeg exited ..." + String(streamKey).slice(-4) + " code=" + code);
    }
  });
  return { started: true };
}
function packagingStatus(streamKey) {
  const e = _activeGet(String(streamKey || ""));
  if (!e) return null;
  return { status: e.status, error: e.error, pid: e.child && e.child.pid };
}
function _activeGet(k) { return active.get(k); }
/* Phase 31.1: map a packager failure onto the stream so the creator/viewer
 * probe reports failed (with an honest, key-free message) instead of
 * preparing forever while ffmpeg is dead. */
function describePackagingFailure(streamKey) {
  const e = _activeGet(String(streamKey || ""));
  if (!e || e.status !== "failed") return "";
  const raw = String(e.error || "packager failed");
  return raw.replace(/rtmp:\/\/\S+/gi, "rtmp://<ingest-host>/live/<key-redacted>")
    .replace(/\b[0-9a-f]{16,}\b/gi, "<key-redacted>").slice(0, 220);
}
function stopPackaging(streamKey, o) {
  const opts = o || {};
  const log = opts.logger || console;
  if (!isValidKey(streamKey)) return false;
  const entry = active.get(streamKey);
  if (!entry) return false;
  active.delete(streamKey);
  entry.status = "stopped";
  try {
    if (entry.child && entry.child.exitCode === null && typeof entry.child.kill === "function") {
      entry.child.kill("SIGTERM");
      setTimeout(() => {
        try { if (entry.child.exitCode === null) entry.child.kill("SIGKILL"); }
        catch (_e) { /* ignore */ }
      }, 3000);
    }
  } catch (_e) { /* ignore */ }
  if (opts.removeFiles && entry.outDir) {
    try { fs.rmSync(entry.outDir, { recursive: true, force: true }); }
    catch (err) { log.warn("[live][hls] cleanup failed: " + err.message); }
  } else {
    log.log("[live][hls] packaging stopped for ..." + String(streamKey).slice(-4));
  }
  return true;
}
function stopAll(o) {
  const keys = Array.from(active.keys());
  for (const k of keys) stopPackaging(k, o);
  return keys.length;
}
function isPlaybackReady(mediaRoot, streamKey) {
  if (!mediaRoot || !isValidKey(streamKey)) return { ready: false, reason: "invalid" };
  const dir = streamDir(mediaRoot, streamKey);
  const playlist = playlistPath(mediaRoot, streamKey);
  let text = "";
  try {
    const stat = fs.statSync(playlist);
    if (!stat.isFile() || stat.size < 32) return { ready: false, reason: "playlist-missing" };
    text = fs.readFileSync(playlist, "utf8");
  } catch (_e) { return { ready: false, reason: "playlist-missing" }; }
  if (!/#EXTM3U/i.test(text) || !/#EXTINF/i.test(text)) return { ready: false, reason: "playlist-not-ready" };
  let entries = [];
  try { entries = fs.readdirSync(dir); }
  catch (_e) { return { ready: false, reason: "segments-missing" }; }
  const seg = entries.find((f) => f.endsWith(".ts"));
  if (!seg) return { ready: false, reason: "segments-missing" };
  try {
    const st = fs.statSync(path.join(dir, seg));
    if (!st.isFile() || st.size === 0) return { ready: false, reason: "segments-missing" };
  } catch (_e) { return { ready: false, reason: "segments-missing" }; }
  return { ready: true, reason: "ready" };
}
module.exports = {
  KEY_RE, isValidKey, streamDir, playlistPath, buildArgs,
  startPackaging, stopPackaging, stopAll, packagingStatus,
  describePackagingFailure,
  isPlaybackReady, _active: active,
};
