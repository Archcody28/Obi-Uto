"use strict";
/* Phase 32 — open-source RTMP publisher regression (expo-live-stream/RootEncoder).
 * Static checks only; no secrets. Asserts: NodeMedia gone from app code/deps,
 * single-view preview+publish model, flip/mute via native calls, credential
 * hygiene, backend ingest contract unchanged. */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const results = [];
function record(name, pass, detail) {
  results.push({ name, pass: !!pass, detail: String(detail || "") });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  const camSrc = fs.readFileSync(
    path.join(ROOT, "mobile", "src", "screens", "LiveCameraScreen.tsx"), "utf8");
  const svcSrc = fs.readFileSync(
    path.join(ROOT, "mobile", "src", "services", "livePublishService.js"), "utf8");
  const apiSrc = fs.readFileSync(
    path.join(ROOT, "mobile", "src", "api", "liveStreamApi.js"), "utf8");
  const pkg = JSON.parse(fs.readFileSync(
    path.join(ROOT, "mobile", "package.json"), "utf8"));
  const mediaSrc = fs.readFileSync(
    path.join(ROOT, "server", "src", "streaming", "mediaServer.js"), "utf8");

  record("open-source publisher dep present, NodeMedia dep gone",
    pkg.dependencies["expo-live-stream"] && !pkg.dependencies["expo-nodemediaclient"], "");
  const strippedCam = camSrc
    .replace(/capability\.NodePublisher/g, "")
    .replace(/NodePublisher: null, \/\/ back-compat key for older capability readers/g, "");
  const strippedSvc = svcSrc.replace(/registerNodeMediaLicense/g, ""); // no-op shim name is intentional back-compat
  record("no NodeMedia client SDK refs in app source (compat seams excluded)",
    ![strippedCam, strippedSvc, apiSrc].some((s) =>
      /expo-nodemediaclient|NMC_CODEC|NMC_PROFILE|setLicense|nodemedia\.cn|NODEMEDIA_|NodeMedia publisher|NodeMediaClient/i.test(s)), "");
  record("no license config anywhere in mobile source",
    !/EXPO_PUBLIC_NODEMEDIA|nodeMediaIosLicense|nodeMediaAndroidLicense/i.test(camSrc + svcSrc + apiSrc), "");
  record("service probes expo-live-stream, Expo Go safe",
    svcSrc.includes('require("expo-live-stream")') &&
    svcSrc.includes("ExpoLiveStreamPublisherView") &&
    svcSrc.includes("available: false") &&
    svcSrc.includes('appOwnership === "expo"'), "");
  record("service exposes Expo Go-safe loader + license no-op shim",
    svcSrc.includes("loadPublisherView") && svcSrc.includes("not-applicable-open-source"), "");
  record("single view handles preview + publish (no camera swap)",
    camSrc.includes("showNativePublisher") && camSrc.includes("showExpoGoPreview") &&
    !/showPublisher|showPreview|previewUnmounted|preview.*unmounts FIRST/i.test(camSrc), "");
  record("no remount-key on publisher view",
    !/key=\{frontCamera|key=\{muted/.test(camSrc), "");
  record("flip via native switchCamera, mute via native toggleMute",
    camSrc.includes("publisherRef.current.switchCamera") &&
    camSrc.includes("publisherRef.current.toggleMute") &&
    camSrc.includes("switchCamera") && camSrc.includes("toggleMute"), "");
  record("publish uses buildPublishUrl + owner ingest (key never in state/logs)",
    camSrc.includes("buildPublishUrl") && camSrc.includes("getStreamIngest") &&
    !/useState\([^)]*publishUrl|publishUrl.*useState/i.test(camSrc) &&
    camSrc.includes("sanitizePublishError"), "");
  record("connection/error events + safe disconnect gate",
    camSrc.includes("onConnectionSuccess") && camSrc.includes("onConnectionFailed") &&
    camSrc.includes("onDisconnect") && camSrc.includes("onStreamStateChanged") &&
    camSrc.includes("expectDisconnectRef") && camSrc.includes("normal lifecycle"), "");
  record("LIVE only after server confirmation, End Live path intact",
    camSrc.includes("getOwnerStatus") && camSrc.includes("CONNECTING") &&
    camSrc.includes('requestStop("user-end-live")') && camSrc.includes("endOwnStream"), "");
  record("backend ingest contract unchanged (/live/<key>, prePublish, HLS static)",
    mediaSrc.includes('nms.on("prePublish"') && mediaSrc.includes("startHlsStaticServer") &&
    mediaSrc.includes("/live"), "");
  const failed = results.filter((r) => !r.pass);
  console.log(`\nPhase 32: ${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exitCode = 1;
}

main().catch((err) => { console.error("Phase 32 harness failed:", err); process.exitCode = 1; });
