"use strict";
/* Phase 30 regression suite — native mobile camera live streaming. */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");

const results = [];
function record(name, pass, detail) {
  results.push({ name, pass: !!pass, detail: String(detail || "") });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  const routesSrc = fs.readFileSync(
    path.join(ROOT, "server", "src", "routes", "liveStreamRoutes.js"),
    "utf8"
  );
  const ctrlSrc = fs.readFileSync(
    path.join(ROOT, "server", "src", "controllers", "liveStreamController.js"),
    "utf8"
  );
  const mediaSrc = fs.readFileSync(
    path.join(ROOT, "server", "src", "streaming", "mediaServer.js"),
    "utf8"
  );
  const modelSrc = fs.readFileSync(
    path.join(ROOT, "server", "src", "models", "LiveStream.js"),
    "utf8"
  );

  record(
    "mobile-signal + owner status routes are auth-guarded",
    routesSrc.includes('router.post("/mobile-signal/:id", authMiddleware, mobileSignal)') &&
      routesSrc.includes('router.get("/status/:id", authMiddleware, getOwnerStatus)'),
    ""
  );
  record(
    "public discovery routes still key-free",
    routesSrc.includes('router.get("/live"') && routesSrc.includes('router.get("/discover"'),
    ""
  );
  record(
    "mobileSignal never sets isLive=true",
    ctrlSrc.includes("Only real RTMP") && ctrlSrc.includes("exports.mobileSignal"),
    ""
  );
  record(
    "owner status reflects ingest state only",
    ctrlSrc.includes("exports.getOwnerStatus") && ctrlSrc.includes("Boolean(fresh.isLive)"),
    ""
  );
  record(
    "stale mobile sweeper exists",
    ctrlSrc.includes("sweepStaleMobileSessions") &&
      fs.existsSync(path.join(ROOT, "server", "src", "streaming", "staleSweep.js")),
    ""
  );
  record(
    "model tracks mobile publisher lifecycle",
    modelSrc.includes("publisherSource") &&
      modelSrc.includes("publisherHeartbeatAt") &&
      modelSrc.includes("mobileSessionActive"),
    ""
  );
  record(
    "ingest rejects unknown stream keys (prePublish)",
    mediaSrc.includes('nms.on("prePublish"'),
    ""
  );
  record(
    "endStream clears the mobile session",
    ctrlSrc.includes("mobileSessionActive: false"),
    ""
  );

  const camSrc = fs.readFileSync(
    path.join(ROOT, "mobile", "src", "screens", "LiveCameraScreen.tsx"),
    "utf8"
  );
  const createSrc = fs.readFileSync(
    path.join(ROOT, "mobile", "src", "screens", "CreateLiveStreamScreen.tsx"),
    "utf8"
  );
  const svcSrc = fs.readFileSync(
    path.join(ROOT, "mobile", "src", "services", "livePublishService.js"),
    "utf8"
  );
  const appText = fs.readFileSync(path.join(ROOT, "mobile", "app.json"), "utf8");
  const plugins = appText;

  record(
    "camera screen uses native NodePublisher start/stop",
    camSrc.includes("NodePublisher") &&
      camSrc.includes(".start?.(") &&
      camSrc.includes(".stop?.()"),
    ""
  );
  record(
    "camera screen polls owner status before showing LIVE",
    camSrc.includes("getOwnerStatus") && camSrc.includes("CONNECTING"),
    ""
  );
  record(
    "camera screen has flip + mute controls",
    camSrc.includes("Flip") && camSrc.includes("Mute"),
    ""
  );
  record(
    "create flow navigates to live camera (no OBS instructions)",
    createSrc.includes("/live-camera") && !createSrc.includes("open OBS"),
    ""
  );
  record(
    "publish service lazy-loads native module (Expo Go safe)",
    svcSrc.includes("expo-nodemediaclient") && svcSrc.includes("available: false"),
    ""
  );
  record(
    "app.json wires camera + publisher plugins and permissions",
    plugins.includes("expo-camera") &&
      plugins.includes("expo-nodemediaclient") &&
      plugins.includes("android.permission.CAMERA"),
    ""
  );
  record(
    "live-camera route registered",
    fs.existsSync(path.join(ROOT, "mobile", "src", "app", "live-camera.tsx")),
    ""
  );

  const failed = results.filter((r) => !r.pass);
  console.log(`\nPhase 30: ${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error("Phase 30 harness failed:", err);
  process.exitCode = 1;
});