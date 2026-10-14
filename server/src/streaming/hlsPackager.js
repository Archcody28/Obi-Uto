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
    "-i", ffmpegInput,
    "-c:v", "libx264", "-preset", "veryfast", "-tune", "zerolatency",
    "-c:a", "aac", "-ar", "44100",
    "-f", "hls", "-hls_time", "2", "-hls_list_size", "6",
    "-hls_flags", "delete_segments+append_list",
    "-hls_segment_filename", path.join(outDir, "seg-%05d.ts"),
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
  try { child = run(ffmpegPath, args, { stdio: "ignore", windowsHide: true }); }
  catch (err) { return { started: false, reason: "spawn-failed" }; }
  if (!child || !child.pid) return { started: false, reason: "spawn-failed" };
  const entry = { child, status: "starting", error: "", startedAt: new Date(), playlist, outDir };
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
      entry.error = "ffmpeg exited code=" + code + " signal=" + (signal || "none");
      log.warn("[live][hls] ffmpeg exited ..." + String(streamKey).slice(-4));
    }
  });
  return { started: true };
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
function packagingStatus(streamKey) {
  const e = active.get(String(streamKey || ""));
  if (!e) return null;
  return { status: e.status, error: e.error, pid: e.child && e.child.pid };
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
  isPlaybackReady, _active: active,
};
