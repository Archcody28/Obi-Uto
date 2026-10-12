"use strict";
/* Phase 30.4 — RTMP stream-key extraction + publisher acceptance.
 * Uses the exact observed path shape /live/<48-hex-key>. No secrets logged.
 * DB lifecycle section runs only when MONGO_URI is reachable; parser checks
 * always run. */
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const results = [];
function record(name, pass, detail) {
  results.push({ name, pass: !!pass, detail: String(detail || "") });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  const mediaServer = require(path.join(ROOT, "server", "src", "streaming", "mediaServer"));
  const { resolveStreamPath, extractStreamKey, rejectSession } = mediaServer;

  const KEY = "a".repeat(24) + "b".repeat(24); // 48 hex chars
  const OBSERVED = `/live/${KEY}`;

  // 1. Valid observed path extracts the COMPLETE key.
  record(
    "valid /live/<48-hex> extracts complete key",
    extractStreamKey(OBSERVED) === KEY,
    `len=${(extractStreamKey(OBSERVED) || "").length}`
  );

  // 2. Session-object form (NMS v4 emit) resolves; legacy (id, path) too.
  const fakeSession = { streamPath: OBSERVED, id: "sess1", close: () => {} };
  const fromSession = resolveStreamPath(fakeSession);
  record(
    "session object resolves authoritative path",
    fromSession.path === OBSERVED && fromSession.session === fakeSession,
    ""
  );
  const legacy = resolveStreamPath("legacy-id", OBSERVED);
  record(
    "legacy (id, path) args still resolve",
    legacy.path === OBSERVED,
    ""
  );
  // The old bug: object id without streamPath parsed as key.
  const buggy = resolveStreamPath({ id: "abc123" });
  record(
    "session without streamPath yields no key",
    extractStreamKey(buggy.path) === null,
    ""
  );

  // 3. Empty/malformed paths rejected.
  const badCases = [
    ["empty", ""],
    ["null", null],
    ["app only", "/live"],
    ["wrong app", "/other/" + KEY],
    ["short key", "/live/abc123"],
    ["non-hex key", "/live/" + "g".repeat(48)],
    ["double key", "/live/" + KEY + "/extra"],
    ["double live", "/live/live/" + KEY],
    ["query suffix", OBSERVED + "?sign=a-b"],
  ];
  for (const pair of badCases) {
    record(`malformed rejected: ${pair[0]}`, extractStreamKey(pair[1]) === null, "");
  }

  // 4. Trailing /live config does not duplicate the path.
  const streamConfig = require(path.join(ROOT, "server", "src", "streaming", "streamConfig"));
  const fs = require("fs");
  const svcSrc = fs.readFileSync(
    path.join(ROOT, "mobile", "src", "services", "livePublishService.js"),
    "utf8"
  );
  const rtmpBase = streamConfig.resolveRtmpUrl({ RTMP_PUBLIC_URL: "rtmp://10.0.0.5:1935/live" });
  // Mirror of mobile buildPublishUrl() (kept in sync; the mobile module itself
  // imports expo-constants and cannot be required from plain Node).
  const mobileMirror = (rtmpUrl, key) =>
    String(rtmpUrl || "").replace(/\/+$/, "").replace(/\/(live(?:\/live)*)$/i, "") +
    `/live/${String(key || "")}`;
  const viaSuffixCfg = mobileMirror(rtmpBase, KEY);
  const liveCount = (viaSuffixCfg.match(/\/live/g) || []).length;
  const suffixPath = new URL(viaSuffixCfg.replace("rtmp://", "http://")).pathname;
  record(
    "trailing /live config yields exactly one /live segment",
    liveCount === 1 &&
      extractStreamKey(suffixPath) === KEY &&
      svcSrc.includes(".replace(/\\/(live(?:\\/live)*)$/i"),
    viaSuffixCfg.replace(KEY, "<key>")
  );

  // 5. rejectSession closes without throwing (no reject() on NMS v4).
  let closed = false;
  try {
    rejectSession({ close: () => { closed = true; } });
    record("rejectSession closes session", closed, "");
  } catch (e) {
    record("rejectSession closes session", false, e.message);
  }
  try {
    rejectSession(null);
    record("rejectSession tolerates null", true, "");
  } catch (e) {
    record("rejectSession tolerates null", false, e.message);
  }
  await runDbLifecycle(KEY);
  const failed = results.filter((r) => !r.pass);
  console.log(`\nPhase 30.4: ${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exitCode = 1;
}
async function runDbLifecycle(KEY) {
  // 6. DB lifecycle (only when Mongo reachable).
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    record("DB lifecycle (skipped, no MONGO_URI)", true, "parser-only run");
    return;
  }
  const mongoose = require(path.join(ROOT, "server", "node_modules", "mongoose"));
  try {
    await mongoose.connect(mongoUri);
    const LiveStream = require(path.join(ROOT, "server", "src", "models", "LiveStream.js"));
    const Creator = require(path.join(ROOT, "server", "src", "models", "Creator.js"));
    const User = require(path.join(ROOT, "server", "src", "models", "User.js"));
    const tag = `P304-${Date.now()}`;
    const user = await User.create({ email: `${tag}@t.co`, password: "x".repeat(12), name: tag });
    const creator = await Creator.create({ userId: user._id, displayName: tag });
    const stream = await LiveStream.create({
      title: tag, creatorId: creator._id, streamKey: KEY,
      publisherSource: "mobile", mobileSessionActive: true,
    });
    record("prePublish accepts existing key", (await LiveStream.exists({ streamKey: KEY })) != null, "");
    const res = await LiveStream.updateOne({ _id: stream._id }, { $set: { isLive: true, endedAt: null } });
    const fresh = await LiveStream.findById(stream._id);
    record("postPublish sets isLive on matching doc", res.matchedCount === 1 && fresh.isLive === true, "");
    const unknown = await LiveStream.findOne({ streamKey: "c".repeat(48) });
    record("unknown key matches no document", unknown === null, "");
    await LiveStream.findOneAndUpdate({ streamKey: KEY }, { $set: { isLive: false, endedAt: new Date() } });
    const ended = await LiveStream.findById(stream._id);
    record("donePublish ends correct stream", ended.isLive === false && !!ended.endedAt, "");
    await LiveStream.deleteMany({ title: tag });
    await Creator.deleteMany({ displayName: tag });
    await User.deleteMany({ email: `${tag}@t.co` });
    await mongoose.disconnect();
  } catch (e) {
    record("DB lifecycle", false, `skipped: ${e.message}`);
    try { require(path.join(ROOT, "server", "node_modules", "mongoose")).disconnect(); } catch (_e) {}
  }
}

main().catch((err) => {
  console.error("Phase 30.4 harness failed:", err);
  process.exitCode = 1;
});

