"use strict";
/* Phase 29 regression suite — live streaming.
 *
 * Covers:
 *  1. Environment-derived RTMP/HLS URLs (no LAN IP, no Windows-only FFmpeg).
 *  2. Stream-key privacy (sanitizer + public query projections).
 *  3. Viewer-count accounting (idempotent join/leave, disconnect, no negatives).
 *  4. Recording failure handling (missing file / upload failure never throws).
 *  5. Static source guards (media server, socket, controller wiring).
 *  6. Optional DB-backed lifecycle/ownership tests when MONGO_URI is set.
 *
 * Run: node validation/phase29/harness.js
 */
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");

const results = [];
function record(name, pass, detail) {
  results.push({ name, pass: !!pass, detail: String(detail || "") });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  /* ---------- 1. streamConfig ---------- */
  const {
    resolveMediaBaseUrl,
    resolveRtmpUrl,
    resolveFfmpegPath,
    getIngestInfo,
  } = require(path.join(ROOT, "server", "src", "streaming", "streamConfig"));

  record(
    "media base url honors MEDIA_BASE_URL",
    resolveMediaBaseUrl({ MEDIA_BASE_URL: "https://cdn.example.com/" }) === "https://cdn.example.com",
    resolveMediaBaseUrl({ MEDIA_BASE_URL: "https://cdn.example.com/" })
  );

  record(
    "media base url requires explicit value in production",
    resolveMediaBaseUrl({ NODE_ENV: "production" }) === null,
    String(resolveMediaBaseUrl({ NODE_ENV: "production" }))
  );

  const devBase = resolveMediaBaseUrl({});
  record(
    "dev media base fallback is localhost (no LAN IP)",
    devBase === "http://localhost:8000" && !/192\.168\./.test(devBase),
    devBase
  );

  record(
    "rtmp url derives from MEDIA_BASE_URL host",
    resolveRtmpUrl({ MEDIA_BASE_URL: "https://stream.example.com:8000" }) ===
      "rtmp://stream.example.com:1935",
    resolveRtmpUrl({ MEDIA_BASE_URL: "https://stream.example.com:8000" })
  );

  record(
    "rtmp url honors RTMP_PUBLIC_URL override",
    resolveRtmpUrl({ RTMP_PUBLIC_URL: "rtmp://ingest.example.com:1935/" }) ===
      "rtmp://ingest.example.com:1935",
    resolveRtmpUrl({ RTMP_PUBLIC_URL: "rtmp://ingest.example.com:1935/" })
  );

  record(
    "rtmp url uses PUBLIC_HOST when set",
    resolveRtmpUrl({ PUBLIC_HOST: "cast.example.com" }) === "rtmp://cast.example.com:1935",
    resolveRtmpUrl({ PUBLIC_HOST: "cast.example.com" })
  );

  record(
    "ffmpeg not assumed when unset and no binary exists",
    resolveFfmpegPath({}, () => false) === null,
    String(resolveFfmpegPath({}, () => false))
  );

  record(
    "explicit FFMPEG_PATH is honored",
    resolveFfmpegPath({ FFMPEG_PATH: "/opt/ffmpeg" }, () => false) === "/opt/ffmpeg",
    resolveFfmpegPath({ FFMPEG_PATH: "/opt/ffmpeg" }, () => false)
  );

  const ingest = getIngestInfo({}, () => false);
  record(
    "ingest info reports ffmpeg warning when missing",
    ingest.ffmpegReady === false && ingest.warnings.some((w) => w.includes("FFmpeg")),
    JSON.stringify(ingest.warnings)
  );

  record(
    "ingest info never contains a LAN IP",
    !/192\.168\./.test(JSON.stringify(ingest)),
    ""
  );

  /* ---------- 2. stream-key privacy ---------- */
  const controller = require(path.join(
    ROOT, "server", "src", "controllers", "liveStreamController"
  ));

  const sanitized = controller.sanitizeStream({
    _id: "abc",
    title: "T",
    streamKey: "super-secret-key",
    notifyUsers: ["u1"],
    isLive: true,
  });

  record(
    "sanitizeStream strips streamKey",
    sanitized.streamKey === undefined,
    String(sanitized.streamKey)
  );
  record(
    "sanitizeStream strips notifyUsers",
    sanitized.notifyUsers === undefined,
    String(sanitized.notifyUsers)
  );
  record(
    "sanitizeStream keeps public fields",
    sanitized.title === "T" && sanitized.isLive === true,
    ""
  );

  const docLike = {
    toObject() {
      return { _id: "x", streamKey: "k", viewers: 3 };
    },
  };
  record(
    "sanitizeStream handles mongoose-like documents",
    controller.sanitizeStream(docLike).streamKey === undefined,
    ""
  );

  record(
    "sanitizeStreams maps arrays",
    Array.isArray(controller.sanitizeStreams([docLike, docLike])) &&
      controller.sanitizeStreams([docLike, docLike]).every((s) => !s.streamKey),
    ""
  );

  /* Static: public queries must project streamKey out. */
  const ctlSrc = fs.readFileSync(
    path.join(ROOT, "server", "src", "controllers", "liveStreamController.js"),
    "utf8"
  );
  const publicHandlers = ["exports.getLiveStreams", "exports.getDiscovery", "exports.getStream"];
  for (const handler of publicHandlers) {
    const idx = ctlSrc.indexOf(handler);
    const body = ctlSrc.slice(idx, idx + 1200);
    record(
      `public handler ${handler} excludes streamKey projection`,
      body.includes("-streamKey"),
      ""
    );
  }

  record(
    "controller exposes owner-only ingest endpoint",
    ctlSrc.includes("exports.getIngestInfo") && ctlSrc.includes("loadOwnedStream"),
    ""
  );


  /* ---------- 3. viewer accounting ---------- */
  const { ViewerRegistry } = require(path.join(
    ROOT, "server", "src", "streaming", "viewerRegistry"
  ));

  const reg = new ViewerRegistry();
  record("join returns count 1 for first socket", reg.join("s1", "a").count === 1, "");
  record(
    "double join from same socket does not inflate",
    reg.join("s1", "a").count === 1 && reg.join("s1", "a").changed === false,
    String(reg.get("s1"))
  );
  record("second socket increments", reg.join("s1", "b").count === 2, "");
  record(
    "leave without join does not decrement",
    reg.leave("s1", "ghost").count === 2 && reg.leave("s1", "ghost").changed === false,
    String(reg.get("s1"))
  );
  record("real leave decrements", reg.leave("s1", "a").count === 1, "");
  record(
    "double leave cannot go negative",
    reg.leave("s1", "a").count === 1 && reg.get("s1") === 1,
    String(reg.get("s1"))
  );
  reg.join("s2", "b");
  reg.join("s3", "b");
  const affected = reg.disconnect("b");
  record(
    "disconnect releases every joined room",
    reg.get("s1") === 0 && reg.get("s2") === 0 && reg.get("s3") === 0 &&
      affected.length === 3,
    JSON.stringify(affected)
  );
  record("get on unknown stream is 0", reg.get("nope") === 0, "");
  reg.join("s9", "z");
  reg.reset("s9");
  record("reset clears a room", reg.get("s9") === 0, "");


  /* ---------- 4. recording failure handling ---------- */
  const { findRecording, finalizeRecording } = require(path.join(
    ROOT, "server", "src", "streaming", "recordingProcessor"
  ));

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "p29-"));
  fs.mkdirSync(path.join(tmpRoot, "live"), { recursive: true });

  record(
    "findRecording returns null when dir missing",
    findRecording(path.join(tmpRoot, "ghost"), "k1") === null,
    ""
  );
  record("findRecording returns null when no file", findRecording(tmpRoot, "k1") === null, "");

  fs.writeFileSync(path.join(tmpRoot, "live", "k2_1000.mp4"), "x");
  fs.writeFileSync(path.join(tmpRoot, "live", "k2_2000.mp4"), "y");
  fs.writeFileSync(path.join(tmpRoot, "live", "other.mp4"), "z");
  const found = findRecording(tmpRoot, "k2");
  record(
    "findRecording picks newest matching recording",
    found && found.endsWith("k2_2000.mp4"),
    String(found)
  );

  const silent = { log() {}, warn() {}, error() {} };

  const missing = await finalizeRecording({
    streamKey: "k1",
    stream: { title: "T" },
    mediaRoot: tmpRoot,
    uploadRecordedVideo: async () => {
      throw new Error("cloudinary down");
    },
    Media: { create: async () => ({}) },
    logger: silent,
  });
  record(
    "finalizeRecording tolerates missing file",
    missing.archived === false && missing.reason === "no-recording-file",
    JSON.stringify(missing)
  );

  const uploadFail = await finalizeRecording({
    streamKey: "k2",
    stream: { title: "T" },
    mediaRoot: tmpRoot,
    uploadRecordedVideo: async () => {
      throw new Error("cloudinary down");
    },
    Media: { create: async () => ({}) },
    logger: silent,
  });
  record(
    "finalizeRecording survives upload failure",
    uploadFail.archived === false && uploadFail.reason === "upload-failed",
    JSON.stringify(uploadFail)
  );

  const mediaFail = await finalizeRecording({
    streamKey: "k2",
    stream: { title: "T" },
    mediaRoot: tmpRoot,
    uploadRecordedVideo: async () => ({ secure_url: "https://cdn/x.mp4" }),
    Media: {
      create: async () => {
        throw new Error("db down");
      },
    },
    logger: silent,
  });
  record(
    "finalizeRecording survives Media.create failure",
    mediaFail.archived === false && mediaFail.reason === "media-create-failed",
    JSON.stringify(mediaFail)
  );

  let mediaDocOk = false;
  const ok = await finalizeRecording({
    streamKey: "k2",
    stream: { title: "T", description: "D", creatorId: "c" },
    mediaRoot: tmpRoot,
    uploadRecordedVideo: async () => ({ secure_url: "https://cdn/x.mp4" }),
    Media: {
      create: async (doc) => {
        mediaDocOk = doc.title === "T" && doc.type === "video";
        return doc;
      },
    },
    logger: silent,
  });
  record("Media.create receives expected doc", mediaDocOk, "");
  record("finalizeRecording archives successfully", ok.archived === true, JSON.stringify(ok));

  fs.rmSync(tmpRoot, { recursive: true, force: true });

  /* uploadRecordedVideo guard: missing file returns null, does not throw. */
  const uploadUtil = require(path.join(ROOT, "server", "src", "utils", "uploadRecordedVideo"));
  const nullUpload = await uploadUtil(path.join(os.tmpdir(), "definitely-missing-p29.mp4"));
  record("uploadRecordedVideo returns null for missing file", nullUpload === null, String(nullUpload));


  /* ---------- 5. static source guards ---------- */
  const mediaSrc = fs.readFileSync(
    path.join(ROOT, "server", "src", "streaming", "mediaServer.js"),
    "utf8"
  );
  record("mediaServer has no hardcoded LAN IP", !/192\.168\./.test(mediaSrc), "");
  record("mediaServer has no Windows-only ffmpeg path", !/C:\/ffmpeg/i.test(mediaSrc), "");
  record("mediaServer uses streamConfig", mediaSrc.includes("getIngestInfo"), "");
  record("mediaServer reconciles stale sessions", mediaSrc.includes("reconcileStaleLiveStreams"), "");
  record(
    "mediaServer zeroes viewers on donePublish",
    /donePublish[\s\S]*viewers:\s*0/.test(mediaSrc),
    ""
  );

  const socketSrc = fs.readFileSync(
    path.join(ROOT, "server", "src", "socket.js"),
    "utf8"
  );
  record("socket uses ViewerRegistry", socketSrc.includes("ViewerRegistry"), "");
  record("socket declares io locally (no implicit global)", /let io = null;/.test(socketSrc), "");
  record(
    "socket disconnect releases rooms",
    /disconnect[\s\S]*viewerRegistry\.disconnect/.test(socketSrc),
    ""
  );
  record("socket exposes notifyStreamEnded", socketSrc.includes("notifyStreamEnded"), "");

  const legacySrc = fs.readFileSync(
    path.join(ROOT, "server", "src", "controllers", "liveController.js"),
    "utf8"
  );
  record(
    "legacy liveController no longer writes nonexistent status field",
    !legacySrc.includes('status: "live"') && !legacySrc.includes('status: "ended"'),
    ""
  );
  record(
    "legacy liveController delegates to canonical controller",
    legacySrc.includes('require("./liveStreamController")'),
    ""
  );

  const routesSrc = fs.readFileSync(
    path.join(ROOT, "server", "src", "routes", "liveStreamRoutes.js"),
    "utf8"
  );
  record(
    "creator routes are authenticated",
    /authMiddleware,\s*(createStream|startStream|endStream|scheduleStream|getMyStreams|getIngestInfo|updateStream)/.test(routesSrc),
    ""
  );
  record(
    "public routes exist for discovery/list",
    routesSrc.includes('router.get("/live", getLiveStreams)') &&
      routesSrc.includes('router.get("/discover", getDiscovery)'),
    ""
  );

  /* Module-load checks (syntax + import wiring). */
  const modules = [
    "server/src/streaming/streamConfig.js",
    "server/src/streaming/viewerRegistry.js",
    "server/src/streaming/recordingProcessor.js",
    "server/src/utils/uploadRecordedVideo.js",
    "server/src/routes/liveStreamRoutes.js",
    "server/src/routes/liveRoutes.js",
    "server/src/controllers/liveStreamController.js",
    "server/src/controllers/liveController.js",
    "server/src/socket.js",
  ];
  for (const mod of modules) {
    try {
      require(path.join(ROOT, mod));
      record(`module loads: ${mod}`, true, "");
    } catch (err) {
      record(`module loads: ${mod}`, false, err.message);
    }
  }


  /* ---------- 6. optional DB-backed lifecycle tests ---------- */
  try {
    require("dotenv").config({ path: path.join(ROOT, "server", ".env") });
  } catch (_e) { /* dotenv optional */ }

  if (process.env.MONGO_URI) {
    await runDbTests(record);
  } else {
    console.log("SKIP  DB lifecycle tests (no MONGO_URI)");
  }

  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  console.log(`RESULT: ${failed === 0 ? "PASS" : "FAIL"}`);
  process.exit(failed === 0 ? 0 : 1);
}

async function runDbTests(record) {
  const mongoose = require(path.join(ROOT, "server", "node_modules", "mongoose"));

  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });

  const marker = `p29-${Date.now()}`;
  const User = require(path.join(ROOT, "server", "src", "models", "User"));
  const Creator = require(path.join(ROOT, "server", "src", "models", "Creator"));
  const LiveStream = require(path.join(ROOT, "server", "src", "models", "LiveStream"));
  const controller = require(path.join(
    ROOT, "server", "src", "controllers", "liveStreamController"
  ));

  const userA = await User.create({ name: "P29A", email: `${marker}-a@test`, password: "x" });
  const userB = await User.create({ name: "P29B", email: `${marker}-b@test`, password: "x" });
  const creatorA = await Creator.create({ userId: userA._id, displayName: "P29A" });
  const creatorB = await Creator.create({ userId: userB._id, displayName: "P29B" });

  function mockRes() {
    const res = {};
    res.statusCode = 200;
    res.status = (c) => { res.statusCode = c; return res; };
    res.json = (b) => { res.body = b; return res; };
    return res;
  }

  try {
    /* Create */
    const createRes = mockRes();
    await controller.createStream(
      { user: { id: userA._id }, body: { title: "P29 live", category: "Chat" } },
      createRes
    );
    record(
      "DB createStream succeeds for creator",
      createRes.statusCode === 201 && createRes.body.stream && createRes.body.stream.streamKey,
      `status=${createRes.statusCode}`
    );
    const streamId = createRes.body?.stream?._id;

    record(
      "DB createStream message clarifies broadcasting has not started",
      String(createRes.body?.message || "").toLowerCase().includes("does not start"),
      String(createRes.body?.message)
    );

    /* Create without title -> 400 */
    const noTitle = mockRes();
    await controller.createStream({ user: { id: userA._id }, body: {} }, noTitle);
    record("DB createStream rejects empty title", noTitle.statusCode === 400, String(noTitle.statusCode));

    /* Non-creator -> 403 */
    const notCreator = mockRes();
    await controller.createStream(
      { user: { id: "000000000000000000000000" }, body: { title: "x" } },
      notCreator
    );
    record("DB createStream rejects non-creator", notCreator.statusCode === 403, String(notCreator.statusCode));


    /* Public list must not leak the key */
    await LiveStream.updateOne({ _id: streamId }, { $set: { isLive: true } });
    const listRes = mockRes();
    await controller.getLiveStreams({}, listRes);
    const listJson = JSON.stringify(listRes.body);
    record(
      "DB public live list excludes streamKey",
      !listJson.includes(createRes.body.stream.streamKey),
      ""
    );

    /* Public single-stream view must not leak the key */
    const oneRes = mockRes();
    await controller.getStream({ params: { id: streamId } }, oneRes);
    record(
      "DB public stream view excludes streamKey",
      !JSON.stringify(oneRes.body).includes(createRes.body.stream.streamKey),
      ""
    );

    /* Discovery must not leak the key */
    const discRes = mockRes();
    await controller.getDiscovery({}, discRes);
    record(
      "DB discovery excludes streamKey",
      !JSON.stringify(discRes.body).includes(createRes.body.stream.streamKey),
      ""
    );

    /* Owner sees the key via ingest endpoint */
    const ingestRes = mockRes();
    await controller.getIngestInfo({ user: { id: userA._id }, params: { id: streamId } }, ingestRes);
    record(
      "DB owner ingest endpoint returns streamKey",
      ingestRes.statusCode === 200 && ingestRes.body.streamKey === createRes.body.stream.streamKey,
      `status=${ingestRes.statusCode}`
    );

    /* Ownership: userB cannot read userA's key */
    const stealRes = mockRes();
    await controller.getIngestInfo({ user: { id: userB._id }, params: { id: streamId } }, stealRes);
    record(
      "DB non-owner cannot read streamKey (404)",
      stealRes.statusCode === 404,
      String(stealRes.statusCode)
    );

    /* Ownership: userB cannot end userA's stream */
    const stealEnd = mockRes();
    await controller.endStream({ user: { id: userB._id }, params: { id: streamId } }, stealEnd);
    record(
      "DB non-owner cannot end stream (404)",
      stealEnd.statusCode === 404,
      String(stealEnd.statusCode)
    );
    const stillLive = await LiveStream.findById(streamId);
    record("DB stream untouched by non-owner end", stillLive.isLive === true, "");

    /* Ownership: userB cannot update userA's stream */
    const stealUpdate = mockRes();
    await controller.updateStream(
      { user: { id: userB._id }, params: { id: streamId }, body: { title: "hacked" } },
      stealUpdate
    );
    record("DB non-owner cannot update stream (404)", stealUpdate.statusCode === 404, String(stealUpdate.statusCode));

    /* Start does NOT mark live */
    await LiveStream.updateOne({ _id: streamId }, { $set: { isLive: false, endedAt: null } });
    const startRes = mockRes();
    await controller.startStream({ user: { id: userA._id }, params: { id: streamId } }, startRes);
    const afterStart = await LiveStream.findById(streamId);
    record(
      "DB startStream does not fake live state",
      startRes.statusCode === 200 && afterStart.isLive === false,
      `isLive=${afterStart.isLive}`
    );

    /* Owner update works when not live */
    const updRes = mockRes();
    await controller.updateStream(
      { user: { id: userA._id }, params: { id: streamId }, body: { title: "P29 live v2" } },
      updRes
    );
    record("DB owner update succeeds when not live", updRes.statusCode === 200, String(updRes.statusCode));


    /* Lifecycle: live -> end zeroes viewers and stamps endedAt */
    await LiveStream.updateOne({ _id: streamId }, { $set: { isLive: true, viewers: 7 } });
    const endRes = mockRes();
    await controller.endStream({ user: { id: userA._id }, params: { id: streamId } }, endRes);
    const afterEnd = await LiveStream.findById(streamId);
    record(
      "DB endStream marks ended and zeroes viewers",
      endRes.statusCode === 200 && afterEnd.isLive === false && afterEnd.endedAt && afterEnd.viewers === 0,
      `isLive=${afterEnd.isLive} viewers=${afterEnd.viewers}`
    );

    /* Idempotent end */
    const firstEndedAt = String(afterEnd.endedAt);
    const endAgain = mockRes();
    await controller.endStream({ user: { id: userA._id }, params: { id: streamId } }, endAgain);
    const afterEnd2 = await LiveStream.findById(streamId);
    record(
      "DB second end is idempotent",
      endAgain.statusCode === 200 && endAgain.body.alreadyEnded === true &&
        String(afterEnd2.endedAt) === firstEndedAt,
      ""
    );

    /* Mine exposes the key to its owner only */
    const mineRes = mockRes();
    await controller.getMyStreams({ user: { id: userA._id } }, mineRes);
    record(
      "DB getMyStreams includes key for owner",
      Array.isArray(mineRes.body) &&
        mineRes.body.some((s) => s.streamKey === createRes.body.stream.streamKey),
      ""
    );
    const mineB = mockRes();
    await controller.getMyStreams({ user: { id: userB._id } }, mineB);
    record(
      "DB getMyStreams never includes other creators' keys",
      Array.isArray(mineB.body) &&
        !JSON.stringify(mineB.body).includes(createRes.body.stream.streamKey),
      ""
    );

    /* viewer persistence helper sanity on the model */
    await LiveStream.updateOne({ _id: streamId }, { $set: { viewers: 0 } });
    const zeroed = await LiveStream.findById(streamId);
    record("DB viewer count can be persisted at 0", zeroed.viewers === 0, String(zeroed.viewers));

    /* Edit-while-live is refused */
    await LiveStream.updateOne({ _id: streamId }, { $set: { isLive: true } });
    const editLive = mockRes();
    await controller.updateStream(
      { user: { id: userA._id }, params: { id: streamId }, body: { title: "nope" } },
      editLive
    );
    record("DB update refused while live", editLive.statusCode === 409, String(editLive.statusCode));
    await LiveStream.updateOne({ _id: streamId }, { $set: { isLive: false } });

    /* Invalid object id -> 400, not a crash */
    const badId = mockRes();
    await controller.getStream({ params: { id: "not-an-id" } }, badId);
    record("DB getStream rejects invalid id", badId.statusCode === 400, String(badId.statusCode));
  } finally {
    await LiveStream.deleteMany({ title: /^P29/ });
    await Creator.deleteMany({ _id: { $in: [creatorA._id, creatorB._id] } });
    await User.deleteMany({ _id: { $in: [userA._id, userB._id] } });
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error("HARNESS ERROR", err && err.message ? err.message : err);
  process.exit(2);
});

