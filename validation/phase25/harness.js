/* Phase 25 validation: admin auth, stats, reports, moderation actions.
 * Run: node validation/phase25/harness.js
 */
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = process.env.JWT_SECRET || "phase25-test-secret";

let MongoMemoryServer = null;
try {
  MongoMemoryServer = require("mongodb-memory-server").MongoMemoryServer;
} catch (_e) { /* optional */ }

function mockRes() {
  const res = {};
  res.statusCode = 200;
  res.body = null;
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  return res;
}

async function main() {
  const results = [];
  const record = (name, pass, detail) => {
    results.push({ name, pass: !!pass, detail: String(detail || "") });
    console.log((pass ? "PASS" : "FAIL") + " " + name + " " + (detail || ""));
  };
  let mongod = null;
  let uri = process.env.MONGO_URI || "";
  if (!uri && MongoMemoryServer) {
    mongod = await MongoMemoryServer.create();
    uri = mongod.getUri();
  }
  if (!uri) {
    console.log("SKIP: no MONGO_URI and no mongodb-memory-server installed.");
    process.exit(0);
  }
  await mongoose.connect(uri);
  const User = require("../../server/src/models/User");
  const Media = require("../../server/src/models/Media");
  const Creator = require("../../server/src/models/Creator");
  const Report = require("../../server/src/models/Report");
  await User.deleteMany({});
  await Media.deleteMany({});
  await Creator.deleteMany({});
  await Report.deleteMany({});
  const pw = await bcrypt.hash("Password123", 10);
  const admin = await User.create({ name: "A", email: "a@t.test", password: pw, role: "admin" });
  const normal = await User.create({ name: "N", email: "n@t.test", password: pw });
  const other = await User.create({ name: "O", email: "o@t.test", password: pw });
  const creator = await Creator.create({ userId: normal._id, displayName: "Chan" });
  const media = await Media.create({ title: "T", type: "movie", status: "published", videoUrl: "https://x/y.mp4", creatorId: creator._id, uploadedBy: normal._id });
  const adminMw = require("../../server/src/middleware/adminMiddleware");
  const authMw = require("../../server/src/middleware/authMiddleware");
  const adminCtl = require("../../server/src/controllers/adminController");
  const reportCtl = require("../../server/src/controllers/reportController");
  const userTok = jwt.sign({ id: normal._id, email: normal.email }, process.env.JWT_SECRET);
  const r0 = mockRes();
  await authMw({ headers: {} }, r0, () => {});
  record("auth no token -> 401", r0.statusCode === 401, r0.statusCode);
  let nx = false;
  await authMw({ headers: { authorization: "Bearer " + userTok } }, mockRes(), () => { nx = true; });
  record("auth user passes authMw", nx === true, nx);
  const r2 = mockRes();
  let n2 = false;
  await adminMw({ user: { id: normal._id, role: "admin" } }, r2, () => { n2 = true; });
  record("adminMw ignores forged role -> 403", r2.statusCode === 403 && !n2, r2.statusCode);
  const r3 = mockRes();
  let n3 = false;
  await adminMw({ user: { id: admin._id } }, r3, () => { n3 = true; });
  record("adminMw real admin passes", n3 === true, n3);
  global.__P25 = { admin, normal, other, media, adminMw, authMw, adminCtl, reportCtl, mongod, results, record };
  await require("./harness2.js")();
}
main().catch((e) => { console.error("HARNESS ERROR", e && e.message ? e.message : e); process.exit(2); });
