"use strict";
/* Phase 31 — real HLS packaging lifecycle + playback readiness.
 * No secrets. DB section runs only when MONGO_URI is reachable. */
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const results = [];
function record(name, pass, detail) {
  results.push({ name, pass: !!pass, detail: String(detail || "") });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

function fakeChild() {
  const handlers = {};
  return {
    pid: 4242 + Math.floor(Math.random() * 1000),
    exitCode: null,
    killed: [],
    kill(sig) { this.killed.push(sig); },
    on(ev, fn) { handlers[ev] = fn; return this; },
    _emit(ev, a, b) { if (handlers[ev]) handlers[ev](a, b); },
  };
}

function writeReadyPlaylist(dir) {
  const text = "#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:2\n" +
    "#EXTINF:2.0,\nseg-00000.ts\n#EXT-X-ENDLIST\n";
  fs.writeFileSync(path.join(dir, "index.m3u8"), text.repeat(4));
  fs.writeFileSync(path.join(dir, "seg-00000.ts"), Buffer.alloc(188 * 10, 7));
}

async function main() {
  const pack = require(path.join(ROOT, "server", "src", "streaming", "hlsPackager"));
  const mediaSrc = fs.readFileSync(
    path.join(ROOT, "server", "src", "streaming", "mediaServer.js"), "utf8");
  const ctlSrc = fs.readFileSync(
    path.join(ROOT, "server", "src", "controllers", "liveStreamController.js"), "utf8");
  const playerSrc = fs.readFileSync(
    path.join(ROOT, "mobile", "src", "screens", "PlayerScreen.tsx"), "utf8");
  const spawnSrc = fs.readFileSync(
    path.join(ROOT, "server", "src", "streaming", "hlsPackager.js"), "utf8");

  const A = "a".repeat(48);
  const B = "b".repeat(48);

  // 1. Key validation.
  record("rejects invalid keys", !pack.isValidKey("abc") && !pack.isValidKey(""), "");
  record("accepts 48-hex keys", pack.isValidKey(A), "");

  // 2. Unavailable ffmpeg is honest (no throw, no process).
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p31-"));
  let r = pack.startPackaging({ streamKey: A, mediaRoot: tmp });
  record("missing ffmpeg reports unavailable",
    r.started === false && r.reason === "ffmpeg-unavailable", r.reason);
  record("no process tracked without ffmpeg", pack.packagingStatus(A) === null, "");

  // 3. Lifecycle with fake spawn.
  const ffmpeg = path.join(tmp, "ffmpeg-mock");
  fs.writeFileSync(ffmpeg, "x");
  const kids = [];
  const spawnFn = () => { const c = fakeChild(); kids.push(c); return c; };
  const quiet = { log() {}, warn() {}, error() {} };
  r = pack.startPackaging({ streamKey: A, mediaRoot: tmp, ffmpegPath: ffmpeg, spawnFn, logger: quiet });
  record("starts packaging with ffmpeg", r.started === true, "");
  const dup = pack.startPackaging({ streamKey: A, mediaRoot: tmp, ffmpegPath: ffmpeg, spawnFn, logger: quiet });
  record("start is idempotent per key", dup.alreadyRunning === true && kids.length === 1, "");
  const r2 = pack.startPackaging({ streamKey: B, mediaRoot: tmp, ffmpegPath: ffmpeg, spawnFn, logger: quiet });
  record("second stream starts independently", r2.started === true && kids.length === 2, "");
  // ffmpeg argv uses array spawn (no shell) and localhost pull.
  record("spawn uses argv array, no shell",
    spawnSrc.includes("run(ffmpegPath, args") && !/shell\s*:\s*true/.test(spawnSrc), "");
  record("pulls RTMP from localhost only",
    spawnSrc.includes("rtmp://127.0.0.1:"), "");
  // readiness: nothing ready before segments exist.
  let probe = pack.isPlaybackReady(tmp, A);
  record("not playable before segments",
    probe.ready === false && probe.reason !== "ready", probe.reason);
  writeReadyPlaylist(pack.streamDir(tmp, A));
  probe = pack.isPlaybackReady(tmp, A);
  record("playable once playlist + segment exist", probe.ready === true, probe.reason);
  // stopping A cannot touch B.
  record("stop removes only its own key",
    pack.stopPackaging(A, { logger: quiet }) === true &&
    pack.packagingStatus(A) === null &&
    pack.packagingStatus(B) !== null, "");
  pack.stopAll({ logger: quiet });
  record("stopAll clears remaining", pack.packagingStatus(B) === null, "");
  // ffmpeg exit marks failure honestly.
  const k3 = [];
  pack.startPackaging({ streamKey: A, mediaRoot: tmp, ffmpegPath: ffmpeg,
    spawnFn: () => { const c = fakeChild(); k3.push(c); return c; }, logger: quiet });
  k3[0]._emit("exit", 1, null);
  const st = pack.packagingStatus(A);
  record("ffmpeg exit marks failed", st && st.status === "failed", st && st.error);
  pack.stopAll({ logger: quiet });
  fs.rmSync(tmp, { recursive: true, force: true });

  // 4. Wiring checks (static).
  record("postPublish starts packaging",
    mediaSrc.includes("startPackaging({"), "");
  record("donePublish stops only its key",
    mediaSrc.includes("stopPackaging(streamKey"), "");
  record("End Live stops packaging + notifies",
    ctlSrc.includes("stopPackaging(loaded.stream.streamKey") &&
    ctlSrc.includes("notifyStreamEnded(String(stream._id))"), "");
  record("playback endpoint exists",
    ctlSrc.includes("exports.getPlayback"), "");
  record("never playable without playlist check",
    ctlSrc.includes("withPlaybackState") && mediaSrc.includes("getPlaybackState"), "");
  record("player gates on playable + ready",
    playerSrc.includes("livePlayable") && playerSrc.includes("getLivePlaybackApi"), "");
  record("player keeps chat in preparing/failed",
    playerSrc.includes("Preparing live video...") && playerSrc.includes("LiveChatScreen"), "");
  record("no full stream keys logged",
    !/console\.log\(`\[live\].*\$\{streamKey\}/.test(mediaSrc), "");

  const failed = results.filter((x) => !x.pass);
  console.log(`\nPhase 31: ${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exitCode = 1;
}

main().catch((err) => { console.error("Phase 31 harness failed:", err); process.exitCode = 1; });
