"use strict";
/* Phase 28 regression: authMiddleware must resolve the User model.
 * Guards the case-sensitive/broken-path defect (require("./User")).
 * Usage: node validation/phase28/auth-import.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const mwPath = path.join(ROOT, "server", "src", "middleware", "authMiddleware.js");
const src = fs.readFileSync(mwPath, "utf8");

let failed = 0;
function check(name, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed += 1;
}

check(
  "authMiddleware requires ../models/User",
  src.includes('require("../models/User")'),
  'expected require("../models/User")'
);
check(
  "no broken ./User require remains",
  !/require\(["']\.\/User["']\)/.test(src),
  "broken require('./User') still present"
);
try {
  const mw = require(mwPath);
  check("authMiddleware module loads", typeof mw === "function", typeof mw);
} catch (err) {
  check("authMiddleware module loads", false, err.message);
}

console.log(`\nRESULT: ${failed === 0 ? "PASS" : "FAIL"}`);
process.exit(failed === 0 ? 0 : 1);
