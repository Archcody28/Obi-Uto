"use strict";
/*
 * Phase 24 offline-download contract validation.
 *
 * Verifies, without requiring a device or network:
 *  1. mediaDownload util produces a real downloadable representation
 *     (original MP4 reused, Cloudinary MP4 delivery, playlists -> null);
 *  2. the Media API contract exposes `downloadUrl` (schema + toJSON
 *     backfill for legacy documents);
 *  3. creator publishing persists `downloadUrl`;
 *  4. the mobile flow consumes it (service/store/screens wiring).
 *
 * Usage: node validation/phase24/download-contract.js
 * Exit code 1 on any failure.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const SERVER = path.join(ROOT, "server", "src");
const MOBILE = path.join(ROOT, "mobile", "src");

const results = [];
function record(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail || "" });
}

function check(name, fn) {
  try {
    const detail = fn();
    record(name, detail !== false, typeof detail === "string" ? detail : "");
  } catch (err) {
    record(name, false, String(err && err.message ? err.message : err));
  }
}

const {
  normalizeDownloadUrl,
  buildDownloadUrl,
} = require(path.join(SERVER, "utils", "mediaDownload.js"));

/* 1. Downloadable representation rules --------------------------------- */

check("cloudinary original MP4 reused as-is", () => {
  const url = normalizeDownloadUrl(
    "https://res.cloudinary.com/demo/video/upload/v123/media-platform/videos/abc.mp4"
  );
  return url ===
    "https://res.cloudinary.com/demo/video/upload/v123/media-platform/videos/abc.mp4"
    ? true
    : `got ${url}`;
});

check("cloudinary MOV source -> provider MP4 delivery", () => {
  const url = normalizeDownloadUrl(
    "https://res.cloudinary.com/demo/video/upload/v123/media-platform/videos/abc.mov"
  );
  return url ===
    "https://res.cloudinary.com/demo/video/upload/v123/media-platform/videos/abc.mp4"
    ? true
    : `got ${url}`;
});

check("cloudinary HLS playlist -> MP4 delivery (no playlist left)", () => {
  const url = normalizeDownloadUrl(
    "https://res.cloudinary.com/demo/video/upload/sp_16:9/v123/folder/dog.m3u8"
  );
  return (
    typeof url === "string" &&
    url.endsWith(".mp4") &&
    !/m3u8|sp_/.test(url)
  );
});

check("cloudinary playlist without version strips components", () => {
  const url = normalizeDownloadUrl(
    "https://res.cloudinary.com/demo/video/upload/f_auto,q_auto/dog.m3u8"
  );
  return (
    url === "https://res.cloudinary.com/demo/video/upload/dog.mp4"
  );
});

check("non-cloudinary HLS has NO downloadable representation", () => {
  return (
    normalizeDownloadUrl(
      "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
    ) === null
  );
});

check("non-cloudinary direct MP4 kept as-is", () => {
  return (
    normalizeDownloadUrl(
      "https://download.samplelib.com/mp4/sample-5s.mp4"
    ) ===
    "https://download.samplelib.com/mp4/sample-5s.mp4"
  );
});

check("audio file is a single downloadable file", () => {
  return (
    normalizeDownloadUrl(
      "https://res.cloudinary.com/demo/video/upload/v9/track.mp3"
    ) ===
    "https://res.cloudinary.com/demo/video/upload/v9/track.mp3"
  );
});

check("invalid/empty URLs -> null (never fake)", () => {
  return (
    normalizeDownloadUrl("") === null &&
    normalizeDownloadUrl("not-a-url") === null &&
    buildDownloadUrl({}) === null
  );
});

check("buildDownloadUrl falls back from HLS video to audio", () => {
  return (
    buildDownloadUrl({
      videoUrl: "https://test-streams.mux.dev/x.m3u8",
      audioUrl: "https://cdn.example.com/ep1.mp3",
    }) === "https://cdn.example.com/ep1.mp3"
  );
});

/* 2. Media API contract exposes downloadUrl ---------------------------- */

check("Media schema declares downloadUrl", () => {
  const src = fs.readFileSync(
    path.join(SERVER, "models", "Media.js"),
    "utf8"
  );
  return /downloadUrl:\s*\{/.test(src);
});

check("Media.toJSON backfills downloadUrl for legacy docs", () => {
  const Media = require(path.join(SERVER, "models", "Media.js"));
  const doc = new Media({
    title: "Legacy",
    type: "movie",
    videoUrl: "https://res.cloudinary.com/demo/video/upload/v1/x.mov",
  });
  const json = doc.toJSON();
  return json.downloadUrl ===
    "https://res.cloudinary.com/demo/video/upload/v1/x.mp4"
    ? true
    : `got ${json.downloadUrl}`;
});

check("Media.toJSON reports null downloadUrl for HLS-only media", () => {
  const Media = require(path.join(SERVER, "models", "Media.js"));
  const doc = new Media({
    title: "Live-ish",
    type: "movie",
    videoUrl: "https://test-streams.mux.dev/x36xhzz/x36xhls.m3u8",
  });
  const json = doc.toJSON();
  return json.downloadUrl === null
    ? true
    : `got ${json.downloadUrl}`;
});

check("creator publish persists downloadUrl", () => {
  const src = fs.readFileSync(
    path.join(SERVER, "controllers", "creatorUploadController.js"),
    "utf8"
  );
  return (
    /buildDownloadUrl/.test(src) &&
    /downloadUrl: downloadUrl/.test(src)
  );
});

check("upload response exposes downloadUrl", () => {
  const src = fs.readFileSync(
    path.join(SERVER, "controllers", "uploadController.js"),
    "utf8"
  );
  return /downloadUrl:\s*normalizeDownloadUrl\(result\.secure_url\)/.test(
    src
  );
});

/* 3. Mobile flow wiring ----------------------------------------------- */

function readMobile(rel) {
  return fs.readFileSync(path.join(MOBILE, rel), "utf8");
}

check("downloadService orchestrates via startDownload", () => {
  const src = readMobile(path.join("services", "downloadService.js"));
  return (
    /export const startDownload/.test(src) &&
    /resolveDownloadUrl/.test(src) &&
    /authorizeDownload/.test(src) &&
    /totalBytesExpectedToWrite/.test(src) &&
    /isPlaylistUrl/.test(src)
  );
});

check("downloadService never marks invalid transfers completed", () => {
  const src = readMobile(path.join("services", "downloadService.js"));
  return (
    /status < 200 \|\| status >= 300/.test(src) &&
    /verifyLocalFile\(destination\)/.test(src) &&
    /content-length/.test(src)
  );
});

check("store verifies local files and recovers honestly", () => {
  const src = readMobile(path.join("store", "downloadStore.js"));
  return (
    /verifyLocalFile\(item\.uri\)/.test(src) &&
    /Downloaded file is no longer on this device/.test(src) &&
    /persistList/.test(src)
  );
});

check("Player uses real download flow + offline local source", () => {
  const src = readMobile(path.join("screens", "PlayerScreen.tsx"));
  return (
    /startDownload\(/.test(src) &&
    /offlinePinRef/.test(src) &&
    /downloadUrlParam/.test(src) &&
    /localUri \|\|/.test(src)
  );
});

check("Downloads screen retries for real and verifies opens", () => {
  const src = readMobile(path.join("screens", "DownloadScreen.tsx"));
  return (
    /startDownload\(/.test(src) &&
    /verifyLocalFile\(item\.uri\)/.test(src) &&
    /Unavailable offline/.test(src) &&
    /Available offline/.test(src) &&
    /downloadable !== false/.test(src)
  );
});

check("Details passes downloadUrl into the player", () => {
  const src = readMobile(path.join("screens", "DetailsScreen.tsx"));
  return /downloadUrl:\s*\n?\s*item\.downloadUrl/.test(src);
});

check("app loads downloads at startup", () => {
  const src = readMobile(path.join("app", "_layout.tsx"));
  return /loadDownloads\(\)/.test(src);
});

/* Report ---------------------------------------------------------------- */

let failed = 0;
for (const r of results) {
  const mark = r.ok ? "PASS" : "FAIL";
  if (!r.ok) failed += 1;
  console.log(`${mark}  ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
}
console.log(`\n${results.length - failed}/${results.length} checks passed`);
console.log(`RESULT: ${failed === 0 ? "PASS" : "FAIL"}`);
process.exit(failed === 0 ? 0 : 1);

