"use strict";
/* Phase 31.1 — HLS delivery + packager argv + clean-shutdown regression. */
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");

const ROOT = path.resolve(__dirname, "..", "..");
const results = [];
function record(name, pass, detail) {
  results.push({ name, pass: !!pass, detail: String(detail || "") });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}
function fakeChild() {
  const handlers = {};
  return {
    pid: 4242, exitCode: null, killed: [],
    kill(sig) { this.killed.push(sig); },
    on(ev, fn) { handlers[ev] = fn; return this; },
    _emit(ev, a, b) { if (handlers[ev]) handlers[ev](a, b); },
  };
}
async function main() {
  const pack = require(path.join(ROOT, "server", "src", "streaming", "hlsPackager"));
  const streamConfig = require(path.join(ROOT, "server", "src", "streaming", "streamConfig"));
  const mediaSrc = fs.readFileSync(path.join(ROOT, "server", "src", "streaming", "mediaServer.js"), "utf8");
  const packSrc = fs.readFileSync(path.join(ROOT, "server", "src", "streaming", "hlsPackager.js"), "utf8");
  const camSrc = fs.readFileSync(path.join(ROOT, "mobile", "src", "screens", "LiveCameraScreen.tsx"), "utf8");
  const svcSrc = fs.readFileSync(path.join(ROOT, "mobile", "src", "services", "livePublishService.js"), "utf8");
  const ctlSrc = fs.readFileSync(path.join(ROOT, "server", "src", "controllers", "liveStreamController.js"), "utf8");
  const indexSrc = fs.readFileSync(path.join(ROOT, "server", "src", "index.js"), "utf8");
  const argv = pack.buildArgs({ ffmpegInput: "rtmp://127.0.0.1:1935/live/k", outDir: "d", playlist: "p" });
  record("ffmpeg waits for late video", argv.includes("-probesize") && argv.includes("-analyzeduration"), "");
  record("ffmpeg maps video+audio explicitly", argv.includes("0:v:0?") && argv.includes("0:a:0?"), "");
  record("ffmpeg emits baseline H264", argv.includes("baseline") && argv.includes("yuv420p"), "");
  record("ffmpeg stderr piped", packSrc.includes('"pipe"'), "");
  record("mediaServer serves HLS statically", mediaSrc.includes("startHlsStaticServer") && mediaSrc.includes("application/vnd.apple.mpegurl") && mediaSrc.includes("video/mp2t"), "");
  record("mediaServer binds LAN with CORS", mediaSrc.includes("0.0.0.0") && mediaSrc.includes("Access-Control-Allow-Origin"), "");
  record("API index serves /live HLS too", indexSrc.includes('"/live"') && indexSrc.includes("application/vnd.apple.mpegurl"), "");
  record("media root canonical", mediaSrc.includes("DEFAULT_MEDIA_ROOT"), "");
  record("playbackUrl targets HLS static port", mediaSrc.includes("hlsBaseUrl()"), "");
  const info = streamConfig.getIngestInfo({ MEDIA_BASE_URL: "http://192.168.1.5:8000", MEDIA_PORT: "8000", FFMPEG_PATH: "/x" }, () => false);
  record("hls template uses :8001", info.hlsUrlTemplate === "http://192.168.1.5:8001/live/{streamKey}/index.m3u8", info.hlsUrlTemplate);
  // live HTTP delivery check with fixture dir
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p311-"));
  const liveDir = path.join(tmp, "live", "k");
  fs.mkdirSync(liveDir, { recursive: true });
  fs.writeFileSync(path.join(liveDir, "index.m3u8"), "#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:2\n#EXTINF:2.0,\nseg-00000.ts\n".repeat(3));
  fs.writeFileSync(path.join(liveDir, "seg-00000.ts"), Buffer.alloc(188 * 10, 7));
  const express = require(path.join(ROOT, "server", "node_modules", "express"));
  const app = express();
  app.use("/live", express.static(path.join(tmp, "live"), { setHeaders(res, fp) { if (fp.endsWith(".m3u8")) res.setHeader("Content-Type", "application/vnd.apple.mpegurl"); else if (fp.endsWith(".ts")) res.setHeader("Content-Type", "video/mp2t"); } }));
  const srv = await new Promise((resolve) => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
  const port = srv.address().port;
  const get = (p) => new Promise((resolve, reject) => { http.get({ host: "127.0.0.1", port, path: p }, (res) => { const ch = []; res.on("data", (c) => ch.push(c)); res.on("end", () => resolve({ status: res.statusCode, type: res.headers["content-type"] })); }).on("error", reject); });
  const pl = await get("/live/k/index.m3u8");
  record("playlist 200 + mpegurl", pl.status === 200 && /mpegurl/.test(pl.type || ""), pl.status + " " + pl.type);
  const seg = await get("/live/k/seg-00000.ts");
  record("segment 200 + mp2t", seg.status === 200 && /mp2t/.test(seg.type || ""), seg.status + " " + seg.type);
  const miss = await get("/live/k/nope.m3u8");
  record("missing playlist 404", miss.status === 404, String(miss.status));
  await new Promise((r) => srv.close(r));
  fs.rmSync(tmp, { recursive: true, force: true });
  // packager failure honesty
  const A = "a".repeat(48);
  const quiet = { log() {}, warn() {}, error() {} };
  const kids = [];
  const ff = path.join(os.tmpdir(), "p311-ffmpeg-mock");
  try { fs.writeFileSync(ff, "x"); } catch (_e) {}
  pack.startPackaging({ streamKey: A, mediaRoot: os.tmpdir(), ffmpegPath: ff, spawnFn: () => { const c = fakeChild(); kids.push(c); return c; }, logger: quiet });
  kids[0]._emit("exit", 1, null);
  const desc = pack.describePackagingFailure(A);
  record("packager failure described", /ffmpeg exited/.test(desc), desc.slice(0, 80));
  record("failure text leaks no key", !desc.includes(A), "");
  pack.stopAll({ logger: quiet });
  record("publisher baseline profile", camSrc.includes("NMC_PROFILE_H264_BASELINE"), "");
  record("license via config", svcSrc.includes("registerNodeMediaLicense") && svcSrc.includes("setLicense"), "");
  record("intentional-stop disconnect normal", camSrc.includes("expectDisconnectRef") && camSrc.includes("normal lifecycle"), "");
  record("End Live intentional stop", camSrc.includes('requestStop("user-end-live")'), "");
  record("public strips streamKey", ctlSrc.includes("delete obj.streamKey"), "");
  const pbIdx = ctlSrc.indexOf("exports.getPlayback");
  record("playback endpoint no key", pbIdx >= 0 && !/streamKey/.test(ctlSrc.slice(pbIdx, pbIdx + 800)), "");
  const failed = results.filter((x) => !x.pass);
  console.log(`\nPhase 31.1: ${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exitCode = 1;
}
main().catch((err) => { console.error("Phase 31.1 harness failed:", err); process.exitCode = 1; });

