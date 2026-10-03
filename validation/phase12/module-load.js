"use strict";
/*
 * Phase 12 production module-load test.
 *
 * Loads every backend module under NODE_ENV=production.
 * - All files except src/index.js are require()'d directly.
 * - src/index.js (entrypoint: starts HTTP + Socket.IO + NMS + cron jobs) is
 *   require()'d LAST and given a short grace period; any thrown/synchronous
 *   or uncaught exception fails the run. The process is then exited cleanly.
 *
 * Usage: node module-load.js <server/src dir>
 */
process.env.NODE_ENV = "production";
process.env.MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/mediaapp";
process.env.JWT_SECRET =
  process.env.JWT_SECRET || "phase12-module-load-secret-0123456789";
process.env.MEDIA_BASE_URL =
  process.env.MEDIA_BASE_URL || "http://localhost:8000";

const fs = require("fs");
const path = require("path");

const srcRoot = path.resolve(process.argv[2] || "server/src");

let uncaught = null;
process.on("uncaughtException", (err) => {
  uncaught = err;
});
process.on("unhandledRejection", (err) => {
  uncaught = err instanceof Error ? err : new Error(String(err));
});

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.name.endsWith(".js")) out.push(full);
  }
}

const files = [];
walk(srcRoot, files);

const entry = path.join(srcRoot, "index.js");
// Standalone CLI scripts (self-executing + process.exit on require);
// they are syntax-checked and executed separately, not require()-loaded.
const CLI_SCRIPTS = new Set([
  path.join(srcRoot, "utils", "seedMedia.js"),
  path.join(srcRoot, "utils", "seedPlans.js"),
]);
const modules = files
  .filter((f) => f !== entry && !CLI_SCRIPTS.has(f))
  .sort();

const failures = [];
let loaded = 0;

for (const file of modules) {
  try {
    require(file);
    loaded++;
  } catch (err) {
    failures.push({
      file: path.relative(srcRoot, file),
      error: err && err.code ? `${err.code}: ${err.message}` : String(err),
    });
  }
}

let entryOk = false;
let entryError = null;
if (failures.length === 0) {
  try {
    require(entry);
    entryOk = true;
  } catch (err) {
    entryError = err && err.code ? `${err.code}: ${err.message}` : String(err);
  }
} else {
  entryError = "skipped because other modules failed to load";
}

setTimeout(() => {
  const total = modules.length + 1; // + index.js
  console.log(`NODE_ENV=production module load`);
  console.log(`total files:        ${total} (+${CLI_SCRIPTS.size} standalone CLI scripts excluded)`);
  console.log(`loaded (modules):   ${loaded}/${modules.length}`);
  console.log(`entrypoint index.js: ${entryOk ? "loaded" : "FAILED"}`);
  console.log(`MODULE_NOT_FOUND:   ${failures.filter((f) => /MODULE_NOT_FOUND/.test(f.error)).length}`);
  console.log(`other failures:     ${failures.filter((f) => !/MODULE_NOT_FOUND/.test(f.error)).length}`);
  for (const f of failures) console.log(`  FAIL ${f.file}: ${f.error}`);
  if (entryError && !entryOk) console.log(`  FAIL index.js: ${entryError}`);
  if (uncaught) console.log(`  FAIL uncaught: ${uncaught.stack || uncaught}`);
  const ok = failures.length === 0 && entryOk && !uncaught;
  console.log(`RESULT: ${ok ? "PASS" : "FAIL"}`);
  process.exit(ok ? 0 : 1);
}, 3000);
