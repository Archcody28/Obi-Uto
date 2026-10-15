"use strict";
/* Phase 33 — Railway + Vercel deployment preparation regression.
 * Static + unit checks only; no secrets, no network, no browser.
 * Browser/HLS playback verification lives in browser-hls-check.js (optional).
 *
 * Run: node validation/phase33/harness.js
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..", "..");
const results = [];
function record(name, pass, detail) {
  results.push({ name, pass: !!pass, detail: String(detail || "") });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}
function read(p) { return fs.readFileSync(path.join(ROOT, p), "utf8"); }
function fakeChild() {
  const handlers = {};
  return {
    pid: 7777, exitCode: null, killed: [],
    kill(sig) { this.killed.push(sig); },
    on(ev, fn) { handlers[ev] = fn; return this; },
    _emit(ev, a, b) { if (handlers[ev]) handlers[ev](a, b); },
  };
}

async function main() {
  /* ---------- 1. server/Dockerfile ---------- */
  const docker = read("server/Dockerfile");
  const fromMatch = docker.match(/^FROM\s+node:(\d+)/mi);
  const nodeMajor = fromMatch ? Number(fromMatch[1]) : 0;
  record("Dockerfile uses a supported Node LTS (>=20)", nodeMajor >= 20, fromMatch ? `node:${fromMatch[1]}` : "no node base");
  record("Dockerfile installs ffmpeg (HLS packager dependency)", /apt-get/i.test(docker) && /ffmpeg/.test(docker), "");
  record("Dockerfile uses reproducible npm ci", /\bnpm ci\b/.test(docker), "");
  record("Dockerfile sets NODE_ENV=production", /NODE_ENV=production/.test(docker), "");
  record("Dockerfile exposes RTMP port 1935", /^EXPOSE\s+1935/mi.test(docker), "");
  record("Dockerfile starts src/index.js", /CMD\s+\[\s*"node",\s*"src\/index\.js"\s*\]/.test(docker), "");
  const dockerignore = read("server/.dockerignore");
  record(".dockerignore excludes .env + node_modules + media", /\.env/.test(dockerignore) && /node_modules/.test(dockerignore), "");

  /* ---------- 2. Express PORT / health / shutdown ---------- */
  const indexSrc = read("server/src/index.js");
  record("Express binds Railway-provided PORT", /process\.env\.PORT\s*\|\|\s*5000/.test(indexSrc) && /server\.listen\(/.test(indexSrc), "");
  record("/health route present for host health checks", /app\.get\(\s*"\/health"/.test(indexSrc), "");
  record("SIGTERM/SIGINT graceful shutdown registered", /process\.on\(\s*"SIGTERM"/.test(indexSrc) && /process\.on\(\s*"SIGINT"/.test(indexSrc), "");
  record("shutdown closes HTTP server + MongoDB with force-exit guard", /server\.close\(/.test(indexSrc) && /mongoose\.connection/.test(indexSrc) && /Forced shutdown after timeout/.test(indexSrc), "");
  record("API serves /live HLS on the public port", /app\.use\(\s*"\/live"/.test(indexSrc) && /mpegurl/.test(indexSrc), "");

  /* ---------- 3. streamConfig production rules ---------- */
  const sc = require(path.join(ROOT, "server", "src", "streaming", "streamConfig"));
  const prodEnv = { NODE_ENV: "production", MEDIA_BASE_URL: "https://svc.up.railway.app" };
  const prodRtmp = sc.resolveRtmpUrl(prodEnv);
  record("production never defaults RTMP to localhost/media host", prodRtmp === "", prodRtmp || "(empty)");
  record("production RTMP_PUBLIC_URL accepts TCP-proxy host:port",
    sc.resolveRtmpUrl({ ...prodEnv, RTMP_PUBLIC_URL: "rtmp://ingest.tcp.railway.direct:12345" }) === "rtmp://ingest.tcp.railway.direct:12345", "");
  record("production accepts PUBLIC_HOST + RTMP_PORT",
    sc.resolveRtmpUrl({ NODE_ENV: "production", PUBLIC_HOST: "proxy.example.com", RTMP_PORT: "30000" }) === "rtmp://proxy.example.com:30000", "");
  record("dev MEDIA_BASE_URL host fallback preserved (Phase 29 contract)",
    sc.resolveRtmpUrl({ MEDIA_BASE_URL: "https://stream.example.com:8000" }) === "rtmp://stream.example.com:1935", "");
  record("trailing /live suffix stripped from RTMP_PUBLIC_URL",
    sc.resolveRtmpUrl({ RTMP_PUBLIC_URL: "rtmp://x:1935/live" }) === "rtmp://x:1935", "");
  const prodInfo = sc.getIngestInfo({ ...prodEnv, FFMPEG_PATH: "/usr/bin/ffmpeg" }, () => true);
  record("production HLS template is public HTTPS with no internal :8001",
    prodInfo.hlsUrlTemplate === "https://svc.up.railway.app/live/{streamKey}/index.m3u8", prodInfo.hlsUrlTemplate);
  record("production ingest warns when RTMP URL missing",
    prodInfo.warnings.some((w) => w.includes("RTMP_PUBLIC_URL")), JSON.stringify(prodInfo.warnings));
  record("ingest info leaks no LAN IP in production", !/192\.168\./.test(JSON.stringify(prodInfo)), "");
  record("dev :8000 media base still remaps to :8001 (Phase 31.1 contract)",
    sc.resolveHlsBaseUrl("http://192.168.1.5:8000", 8000) === "http://192.168.1.5:8001", "");
  /* ---------- 4. mediaServer wiring ---------- */
  const mediaSrc = read("server/src/streaming/mediaServer.js");
  record("HLS base derived via shared resolveHlsBaseUrl (no port appended)",
    /resolveHlsBaseUrl\(\s*ingest\.mediaBaseUrl/.test(mediaSrc) && !/if \(!port\) return/.test(mediaSrc), "");
  record("RTMP/NMS bind interface explicit (MEDIA_BIND, default 0.0.0.0)",
    /bind:\s*process\.env\.MEDIA_BIND\s*\|\|\s*"0\.0\.0\.0"/.test(mediaSrc), "");
  record("playbackUrl built from hlsBaseUrl()", /hlsBaseUrl\(\)/.test(mediaSrc), "");
  record("shutdown stops FFmpeg packagers + HLS static server",
    /stopAll\(\)/.test(mediaSrc) && /hlsStaticServer\.close/.test(mediaSrc) && /"SIGTERM"/.test(mediaSrc), "");
  record("stream keys redacted in media logs", /redactKey/.test(mediaSrc), "");
  record("HLS static server binds 0.0.0.0 for delivery", /0\.0\.0\.0/.test(mediaSrc), "");

  /* ---------- 5. packager shutdown (functional) ---------- */
  const pack = require(path.join(ROOT, "server", "src", "streaming", "hlsPackager"));
  const quiet = { log() {}, warn() {}, error() {} };
  /* Phase 33 confirmed blocker: -master_pl_name was set to the SAME path as
   * the output playlist, making index.m3u8 a self-referential master
   * (no #EXTINF) — players and isPlaybackReady could never succeed. */
  const argv = pack.buildArgs({ ffmpegInput: "rtmp://127.0.0.1:1935/live/k", outDir: "d", playlist: path.join("d", "index.m3u8") });
  record("HLS output is a plain media playlist (no self-referential master)",
    !argv.includes("-master_pl_name"), argv.includes("-master_pl_name") ? "master_pl present" : "");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p33-"));
  const ffMock = path.join(tmp, "ffmpeg-mock");
  fs.writeFileSync(ffMock, "x");
  const key = "d".repeat(48);
  const kids = [];
  const started = pack.startPackaging({
    streamKey: key, mediaRoot: tmp, ffmpegPath: ffMock,
    spawnFn: () => { const c = fakeChild(); kids.push(c); return c; }, logger: quiet,
  });
  record("packager starts for valid key", started.started === true, JSON.stringify(started));
  const stopped = pack.stopAll({ logger: quiet });
  record("SIGTERM shutdown stops active packagers", stopped === 1 && kids[0].killed.includes("SIGTERM"), JSON.stringify(kids[0].killed));
  record("packager map cleared (no corrupt state after shutdown)", pack._active.size === 0, `size=${pack._active.size}`);
  record("stopAll idempotent (second pass stops nothing)", pack.stopAll({ logger: quiet }) === 0, "");
  fs.rmSync(tmp, { recursive: true, force: true });

  /* ---------- 6. secrets hygiene ---------- */
  let trackedEnv = "(git-unavailable)";
  try {
    trackedEnv = execFileSync("git", ["ls-files", "--", "server/.env"], { cwd: ROOT, encoding: "utf8" }).trim();
  } catch (err) { trackedEnv = `error:${err.message}`; }
  record("server/.env is not tracked by git", trackedEnv === "", trackedEnv);
  record("root .gitignore ignores .env", /\.env/.test(read(".gitignore")), "");
  const envExample = read("server/.env.example");
  record(".env.example documents Railway vars as commented names only",
    ["RTMP_PUBLIC_URL", "MEDIA_BASE_URL", "ALLOWED_ORIGINS"].every((v) => envExample.includes(v)) &&
    /^#RTMP_PUBLIC_URL=/m.test(envExample), "");
  record(".env.example contains no credential-looking values",
    !/sk_(live|test)_\w{8,}|mongodb\+srv:\/\/[^\s]*:[^\s]*@/i.test(envExample), "");

  /* ---------- 7. deployment documentation ---------- */
  const doc = read("docs/phase33-railway-vercel-deployment.md");
  record("doc covers Railway build/start config",
    /Railway/i.test(doc) && /Dockerfile/i.test(doc) && /node src\/index\.js/.test(doc), "");
  record("doc lists required env var names",
    ["MONGO_URI", "JWT_SECRET", "MEDIA_BASE_URL", "RTMP_PUBLIC_URL", "PORT", "ALLOWED_ORIGINS"].every((v) => doc.includes(v)), "");
  record("doc covers RTMP TCP proxy configuration", /TCP proxy/i.test(doc) && /1935/.test(doc), "");
  record("doc covers public HLS/API URL config (no internal :8001 in prod)",
    /MEDIA_BASE_URL/.test(doc) && /:8001/.test(doc), "");
  record("doc covers Vercel root/build/output settings",
    /Root Directory \| `mobile`/.test(doc) && /expo export --platform web/.test(doc) && /\| `dist` \|/.test(doc), "");
  record("doc records browser/HLS limitations honestly",
    /hls\.js/.test(doc) && /Safari/i.test(doc) && /Chrome/i.test(doc), "");
  record("doc records cost/storage/deployment limitations",
    /Ephemeral disk/.test(doc) && /CPU/.test(doc) && /TCP proxy/.test(doc), "");
  record("doc contains no credential values",
    !/sk_(live|test)_\w{8,}|mongodb\+srv:\/\/[^\s]*:[^\s]*@/i.test(doc), "");

  /* ---------- 8. mobile/web ---------- */
  const cfg = read("mobile/src/config.ts");
  record("mobile API/socket URLs overridable via EXPO_PUBLIC_* vars",
    cfg.includes("EXPO_PUBLIC_API_URL") && cfg.includes("EXPO_PUBLIC_SOCKET_URL"), "");
  const pkg = JSON.parse(read("mobile/package.json"));
  record("mobile exposes build:web script for Vercel",
    (pkg.scripts || {})["build:web"] === "expo export --platform web", JSON.stringify((pkg.scripts || {})["build:web"]));
  const distIndex = path.join(ROOT, "mobile", "dist", "index.html");
  if (fs.existsSync(distIndex)) {
    const distHtml = fs.readdirSync(path.join(ROOT, "mobile", "dist"), { recursive: true })
      .filter((f) => String(f).endsWith(".html"));
    record("web export produced route HTML (static output)", distHtml.length >= 10, `${distHtml.length} html files`);
    let lanHits = 0;
    const jsDir = path.join(ROOT, "mobile", "dist", "_expo");
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name.endsWith(".js")) {
          const txt = fs.readFileSync(p, "utf8");
          if (/192\.168\.\d+\.\d+/.test(txt)) lanHits++;
        }
      }
    };
    if (fs.existsSync(jsDir)) walk(jsDir);
    record("web bundle ships no LAN IP (production inlining)", lanHits === 0, `${lanHits} file(s) with LAN IP`);
  } else {
    record("web export output present (run: cd mobile && npx expo export --platform web)", true, "skipped — dist/ absent");
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\nPhase 33: ${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exitCode = 1;
}
main().catch((err) => { console.error("Phase 33 harness failed:", err); process.exitCode = 1; });
