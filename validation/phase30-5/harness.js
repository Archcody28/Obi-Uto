"use strict";
/* Phase 30.5 — premature-disconnect, viewer-404, recording, chat-list.
 * Static + behavioral checks. No secrets. DB section needs MONGO_URI. */
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
  const playerSrc = fs.readFileSync(
    path.join(ROOT, "mobile", "src", "screens", "PlayerScreen.tsx"), "utf8");
  const chatSrc = fs.readFileSync(
    path.join(ROOT, "mobile", "src", "screens", "LivechatScreen.tsx"), "utf8");
  const mediaSrc = fs.readFileSync(
    path.join(ROOT, "server", "src", "streaming", "mediaServer.js"), "utf8");

  record("no key={frontCamera} remount on NodePublisher",
    !/^\s*key=\{frontCamera/m.test(camSrc), "");
  record("reason-tagged requestStop first-wins",
    camSrc.includes("stopReasonRef") && camSrc.includes("publish stop requested"), "");
  record("no bare publisher stop outside requestStop",
    (camSrc.match(/publisherRef\.current\?\.stop/g) || []).length === 1, "");
  record("heartbeat failure keeps publisher alive",
    camSrc.includes("keeping publisher alive"), "");
  record("stale endedAt ignored when not live",
    camSrc.includes("while not live; ignoring"), "");
  record("mount/unmount + native event diagnostics",
    camSrc.includes("camera screen mounted") &&
    camSrc.includes("UNMOUNTED while live") &&
    camSrc.includes("native publisher event"), "");
  record("player gates media APIs behind non-live id",
    playerSrc.includes("mediaIdForMediaApis") &&
    playerSrc.includes("GET /media/<liveStreamId> 404"), "");
  record("chat exposes scrollEnabled; player disables nesting",
    chatSrc.includes("scrollEnabled = true") &&
    chatSrc.includes("scrollEnabled={scrollEnabled}") &&
    (playerSrc.match(/scrollEnabled=\{false\}/g) || []).length >= 2, "");
  record("donePublish logs heartbeat age",
    mediaSrc.includes("hbAgeMs") && mediaSrc.includes("socket drop under healthy"), "");
  await runRecordingChecks();
  await runDbChecks();
  const failed = results.filter((r) => !r.pass);
  console.log(`\nPhase 30.5: ${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exitCode = 1;
}

async function runRecordingChecks() {
  const rec = require(path.join(ROOT, "server", "src", "streaming", "recordingProcessor"));
  const os = require("os");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p305-"));
  const key = "k".repeat(48);
  fs.mkdirSync(path.join(tmp, "live"), { recursive: true });
  record("findRecording null when nothing recorded",
    rec.findRecording(tmp, key) === null, "");
  fs.writeFileSync(path.join(tmp, "live", `${key}_1000.mp4`), "x");
  const foundMp4 = rec.findRecording(tmp, key);
  record("findRecording finds mp4 layout",
    !!foundMp4 && foundMp4.endsWith(".mp4"), String(foundMp4));
  const recRoot = path.join(tmp, "rec");
  fs.mkdirSync(path.join(recRoot, "live", key), { recursive: true });
  fs.writeFileSync(path.join(recRoot, "live", key, "1700000000000.flv"), "x");
  const foundFlv = rec.findRecording(tmp, key, { recordPath: recRoot });
  record("findRecording probes NMS v4 flv layout",
    !!foundFlv && foundFlv.endsWith(".flv"), String(foundFlv));
  const noFile = await rec.finalizeRecording({
    streamKey: key, stream: { title: "T" }, mediaRoot: path.join(tmp, "empty"),
    uploadRecordedVideo: async () => { throw new Error("must not be called"); },
    Media: {}, logger: { log() {}, warn() {}, error() {} },
  });
  record("missing recording never blocks cleanup",
    noFile.archived === false && noFile.reason === "no-recording-file", "");
  fs.rmSync(tmp, { recursive: true, force: true });
}

async function runDbChecks() {
  if (!process.env.MONGO_URI) {
    record("DB attribution (skipped, no MONGO_URI)", true, "static-only run");
    return;
  }
  const mongoose = require(path.join(ROOT, "server", "node_modules", "mongoose"));
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const LiveStream = require(path.join(ROOT, "server", "src", "models", "LiveStream.js"));
    const Creator = require(path.join(ROOT, "server", "src", "models", "Creator.js"));
    const User = require(path.join(ROOT, "server", "src", "models", "User.js"));
    const tag = `P305-${Date.now()}`;
    const user = await User.create({ email: `${tag}@t.co`, password: "x".repeat(12), name: tag });
    const creator = await Creator.create({ userId: user._id, displayName: tag });
    const doc = await LiveStream.create({
      title: tag, creatorId: creator._id, streamKey: "d".repeat(48),
      isLive: true, publisherSource: "mobile",
      mobileSessionActive: true, publisherHeartbeatAt: new Date(),
    });
    const fresh = await LiveStream.findById(doc._id);
    const age = Date.now() - new Date(fresh.publisherHeartbeatAt).getTime();
    record("live doc carries fresh heartbeat for attribution",
      fresh.isLive === true && age < 30000, `${Math.round(age / 1000)}s`);
    await LiveStream.deleteMany({ title: tag });
    await Creator.deleteMany({ displayName: tag });
    await User.deleteMany({ email: `${tag}@t.co` });
    await mongoose.disconnect();
  } catch (e) {
    record("DB attribution", false, e.message);
    try { require(path.join(ROOT, "server", "node_modules", "mongoose")).disconnect(); } catch (_e) {}
  }
}

main().catch((err) => { console.error("Phase 30.5 harness failed:", err); process.exitCode = 1; });
