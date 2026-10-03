"use strict";
/*
 * Phase 11/12 exact-case import resolver.
 *
 * Walks the given source roots, extracts module specifiers from require()/import
 * statements, and resolves each relative specifier segment-by-segment against the
 * REAL directory listing (exact case), so case-mismatched imports that would work
 * on Windows/macOS but FAIL on Linux are reported.
 *
 * Usage: node case-audit.js <dir> [<dir> ...]
 * Exit code 1 if any case-mismatch or unresolved relative import is found.
 */
const fs = require("fs");
const path = require("path");

const roots = process.argv.slice(2);
if (roots.length === 0) {
  console.error("usage: node case-audit.js <dir> [...]");
  process.exit(2);
}

const SPEC_RE =
  /require\(\s*["']([^"'\n]+)["']\s*\)|import\(\s*["']([^"'\n]+)["']\s*\)|from\s+["']([^"'\n]+)["']|import\s+["']([^"'\n]+)["']/g;

const caseViolations = [];
const missingImports = [];
let scannedFiles = 0;
let checkedSpecifiers = 0;

function listDir(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return null;
  }
}

function exactResolve(fromFile, spec) {
  const base = path.resolve(path.dirname(fromFile), spec);
  const root = path.parse(base).root;
  const segs = path.relative(root, base).split(path.sep).filter(Boolean);
  let cur = root;
  for (const seg of segs) {
    const entries = listDir(cur);
    if (!entries) {
      return { ok: false, reason: "missing", detail: cur };
    }
    const hit = entries.find((e) => e.name === seg);
    if (hit) {
      cur = path.join(cur, hit.name);
      continue;
    }
    // Node extension resolution (.js/.json/...) with exact-case check
    let resolved = null;
    let caseBad = null;
    for (const ext of [".js", ".json", ".node", ".ts", ".tsx", ".jsx"]) {
      const want = seg + ext;
      const eh = entries.find((e) => e.name === want);
      if (eh) {
        resolved = path.join(cur, eh.name);
        break;
      }
      const eci = entries.find(
        (e) => e.name.toLowerCase() === want.toLowerCase()
      );
      if (eci && !caseBad) caseBad = eci.name;
    }
    if (resolved) {
      cur = resolved;
      continue;
    }
    if (caseBad) {
      return {
        ok: false,
        reason: "case",
        detail: `in ${cur}: '${seg}(.js)' vs actual '${caseBad}'`,
      };
    }
    // Case check for a directory that exists under different casing
    const ciDir = entries.find(
      (e) => e.name.toLowerCase() === seg.toLowerCase()
    );
    if (ciDir) {
      return {
        ok: false,
        reason: "case",
        detail: `in ${cur}: '${seg}' vs actual '${ciDir.name}'`,
      };
    }
    return {
      ok: false,
      reason: "missing",
      detail: path.join(cur, seg),
    };
  }

  let st = null;
  try {
    st = fs.statSync(cur);
  } catch (e) {}
  if (st && st.isFile()) return { ok: true, resolved: cur };
  if (st && st.isDirectory()) {
    const entries = listDir(cur) || [];
    for (const idx of ["index.js", "index.json"]) {
      const hit = entries.find((e) => e.name === idx);
      if (hit) return { ok: true, resolved: path.join(cur, hit.name) };
      const ci = entries.find(
        (e) => e.name.toLowerCase() === idx.toLowerCase()
      );
      if (ci) {
        return {
          ok: false,
          reason: "case",
          detail: `in ${cur}: '${idx}' vs actual '${ci.name}'`,
        };
      }
    }
    return {
      ok: false,
      reason: "missing",
      detail: path.join(cur, "index.js"),
    };
  }
  return { ok: false, reason: "missing", detail: cur };
}

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name === "node_modules" ||
        entry.name === "dist" ||
        entry.name === ".expo"
      )
        continue;
      walk(full, out);
    } else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
}

const files = [];
for (const r of roots) {
  const abs = path.resolve(r);
  const st = fs.statSync(abs);
  if (st.isDirectory()) walk(abs, files);
  else files.push(abs);
}

for (const file of files) {
  scannedFiles++;
  const src = fs.readFileSync(file, "utf8");
  let m;
  SPEC_RE.lastIndex = 0;
  while ((m = SPEC_RE.exec(src)) !== null) {
    const spec = m[1] || m[2] || m[3] || m[4];
    if (!spec || !spec.startsWith(".")) continue;
    checkedSpecifiers++;
    const res = exactResolve(file, spec);
    if (!res.ok) {
      const entry = `${path.relative(process.cwd(), file)} -> "${spec}" (${
        res.reason === "case" ? "CASE MISMATCH" : "unresolved"
      }: ${res.detail})`;
      if (res.reason === "case") caseViolations.push(entry);
      else missingImports.push(entry);
    }
  }
}

console.log(`scanned files:           ${scannedFiles}`);
console.log(`relative specifiers:     ${checkedSpecifiers}`);
console.log(`case-mismatch imports:   ${caseViolations.length}`);
console.log(`unresolved imports:      ${missingImports.length}`);
for (const v of caseViolations) console.log(`  CASE: ${v}`);
for (const v of missingImports) console.log(`  MISSING: ${v}`);

process.exit(
  caseViolations.length === 0 && missingImports.length === 0 ? 0 : 1
);
