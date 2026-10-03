"use strict";
/*
 * Phase 12 runtime E2E smoke harness (validation tooling - not application code).
 *
 * Runs against an already-started backend (default http://127.0.0.1:5000).
 * Requires: MongoDB running, database seeded (npm run seed / seed-plans),
 * and a FRESH server process (auth rate-limiter state is in-memory).
 *
 * Auth request budget: exactly 11 requests to /api/auth (limiter max = 10,
 * the 11th must be a 429). Do not add extra /api/auth calls.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const BASE = process.env.SMOKE_BASE_URL || "http://127.0.0.1:5000";
const REPO = process.env.REPO_ROOT || path.resolve(__dirname, "..", "..");
const SERVER_DIR = path.join(REPO, "server");

const jwt = require(path.join(SERVER_DIR, "node_modules", "jsonwebtoken"));

function loadSocketClient() {
  const candidates = [
    path.join(REPO, "mobile", "node_modules", "socket.io-client"),
    path.join(REPO, "node_modules", "socket.io-client"),
  ];
  for (const c of candidates) {
    try {
      return require(c);
    } catch (e) {}
  }
  throw new Error(
    "socket.io-client not found; install it (npm i --no-save socket.io-client) or run npm ci in mobile/"
  );
}
const io = loadSocketClient();

// Read server/.env (if present) for values the server itself uses,
// falling back to process.env (CI provides configuration via the environment).
// No secrets are printed.
const env = {};
const envFile = path.join(SERVER_DIR, ".env");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
}
for (const k of ["MONGO_URI", "JWT_SECRET", "PAYSTACK_SECRET_KEY"]) {
  if (!env[k] && process.env[k]) env[k] = process.env[k];
}

const results = [];
function record(name, pass, detail) {
  results.push({ name, pass: !!pass, detail: detail || "" });
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? " | " + detail : ""}`);
}

async function req(method, urlPath, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (opts.rawBody === undefined && opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (opts.rawBody !== undefined) headers["Content-Type"] = "application/json";
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;
  const res = await fetch(BASE + urlPath, {
    method,
    headers,
    body:
      opts.rawBody !== undefined
        ? opts.rawBody
        : opts.body !== undefined
          ? JSON.stringify(opts.body)
          : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (e) {}
  return { status: res.status, headers: res.headers, json, text };
}

function connectSocket(auth, timeout = 6000) {
  return new Promise((resolve) => {
    const sock = io(BASE, { auth, timeout, reconnection: false, forceNew: true });
    const timer = setTimeout(() => {
      sock.close();
      resolve({ connected: false, error: "timeout" });
    }, timeout);
    sock.on("connect", () => {
      clearTimeout(timer);
      sock.close();
      resolve({ connected: true });
    });
    sock.on("connect_error", (err) => {
      clearTimeout(timer);
      sock.close();
      resolve({ connected: false, error: String(err && err.message) });
    });
  });
}

async function waitForHealth(timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await req("GET", "/health");
      if (
        r.status === 200 &&
        r.json &&
        r.json.database &&
        r.json.database.readyState === 1
      ) {
        return r;
      }
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}


(async () => {
  const stamp = Date.now();
  const emailA = `phase12a_${stamp}@example.com`;
  const emailB = `phase12b_${stamp}@example.com`;
  const passA = "Passw0rd!phase12";
  const passB = "Passw0rd!phase12b";

  function summarize() {
    const pass = results.filter((r) => r.pass).length;
    const fail = results.filter((r) => !r.pass).length;
    console.log(
      `\n==== SMOKE SUMMARY: ${pass} passed, ${fail} failed, ${results.length} total ====`
    );
    for (const r of results.filter((x) => !x.pass))
      console.log(`FAILED: ${r.name} ${r.detail}`);
    process.exit(fail === 0 ? 0 : 1);
  }

  // ---------- Health ----------
  const health = await waitForHealth();
  record(
    "health: server up with db readyState=1",
    !!health,
    health
      ? `status=${health.json.status} readyState=${health.json.database.readyState}`
      : "not ready"
  );
  if (!health) {
    summarize();
    return;
  }
  record("health: status=ok", health.json.status === "ok");

  // ---------- Security headers (helmet) ----------
  const hdrNames = [...health.headers.keys()];
  const hasHelmet =
    hdrNames.includes("cross-origin-resource-policy") ||
    hdrNames.includes("x-frame-options") ||
    hdrNames.includes("x-dns-prefetch-control");
  record("helmet: security headers present", hasHelmet, hdrNames.join(","));

  // ---------- Auth (exactly 11 /api/auth requests) ----------
  const r1 = await req("POST", "/api/auth/register", {
    body: { name: "Phase12 A", email: emailA, password: passA },
  });
  record("register A: 201", r1.status === 201, `status=${r1.status}`);

  const r2 = await req("POST", "/api/auth/login", {
    body: { email: emailA, password: passA },
  });
  const tokenA = r2.json && r2.json.token;
  record("login A: 200 + token", r2.status === 200 && !!tokenA, `status=${r2.status}`);
  record(
    "register/login: password never returned",
    !JSON.stringify(r2.json || {}).includes("password")
  );

  const r3 = await req("POST", "/api/auth/register", {
    body: { name: "Phase12 B", email: emailB, password: passB },
  });
  record("register B: 201", r3.status === 201, `status=${r3.status}`);

  const r4 = await req("POST", "/api/auth/login", {
    body: { email: emailB, password: passB },
  });
  const tokenB = r4.json && r4.json.token;
  record("login B: 200 + token", r4.status === 200 && !!tokenB, `status=${r4.status}`);

  const r5 = await req("GET", "/api/auth/me", { token: tokenA });
  record(
    "me valid JWT: 200 + own email",
    r5.status === 200 && r5.json && r5.json.user && r5.json.user.email === emailA,
    `status=${r5.status}`
  );
  record(
    "me: password never returned",
    !JSON.stringify(r5.json || {}).includes("password")
  );

  const r6 = await req("GET", "/api/auth/me");
  record("me missing JWT: 401", r6.status === 401, `status=${r6.status}`);

  const r7 = await req("GET", "/api/auth/me", { token: "not.a.valid.jwt" });
  record("me invalid JWT: 401", r7.status === 401, `status=${r7.status}`);

  const r8 = await req("POST", "/api/auth/login", {
    body: { email: emailA, password: "WrongPassword!123" },
  });
  record("login wrong password: 401", r8.status === 401, `status=${r8.status}`);

  const expired = jwt.sign(
    { id: "000000000000000000000000", email: emailA },
    env.JWT_SECRET || "x",
    { expiresIn: -10 }
  );
  const r9 = await req("GET", "/api/auth/me", { token: expired });
  record("me expired JWT: 401", r9.status === 401, `status=${r9.status}`);

  const r10 = await req("GET", "/api/auth/me", { token: tokenA });
  record("me valid JWT (request 10): 200", r10.status === 200, `status=${r10.status}`);

  const r11 = await req("GET", "/api/auth/me", { token: tokenA });
  record(
    "auth rate limiter: 429 on request 11",
    r11.status === 429,
    `status=${r11.status} msg=${r11.json && r11.json.message}`
  );
  record(
    "auth rate limiter: retryAfter present",
    !!(r11.json && r11.json.retryAfter)
  );

  // ---------- Password hashing (DB level) ----------
  try {
    const mongoose = require(
      path.join(SERVER_DIR, "node_modules", "mongoose")
    );
    await mongoose.connect(env.MONGO_URI || "mongodb://localhost:27017/mediaapp");
    const User = require(path.join(SERVER_DIR, "src", "models", "User.js"));
    const u = await User.findOne({ email: emailA });
    const pw = u && u.password;
    record(
      "password hashed in DB (bcrypt)",
      !!pw && /^\$2[aby]\$/.test(pw) && pw !== passA,
      pw ? `prefix=${pw.slice(0, 7)}` : "user not found"
    );
    await mongoose.disconnect();
  } catch (e) {
    record("password hashed in DB (bcrypt)", false, String(e.message || e));
  }

  // ---------- Media ----------
  const mList = await req("GET", "/api/media");
  record(
    "media listing: 200 + array",
    mList.status === 200 && Array.isArray(mList.json),
    `status=${mList.status} count=${Array.isArray(mList.json) ? mList.json.length : "n/a"}`
  );
  const mediaId =
    Array.isArray(mList.json) && mList.json.length ? mList.json[0]._id : null;

  const mSearch = await req("GET", "/api/media/search?q=Inter");
  record(
    "media search: 200 + array",
    mSearch.status === 200 && Array.isArray(mSearch.json),
    `status=${mSearch.status} count=${Array.isArray(mSearch.json) ? mSearch.json.length : "n/a"}`
  );

  if (mediaId) {
    const mDet = await req("GET", `/api/media/${mediaId}`, { token: tokenA });
    record(
      "media details: 200 + correct id",
      mDet.status === 200 && mDet.json && mDet.json._id === mediaId,
      `status=${mDet.status}`
    );
    const mNoTok = await req("GET", `/api/media/${mediaId}`);
    record(
      "media details without token: 401",
      mNoTok.status === 401,
      `status=${mNoTok.status}`
    );
  } else {
    record("media details: 200 + correct id", false, "no media (run npm run seed)");
    record("media details without token: 401", false, "no media");
  }

  // ---------- Favorites full E2E ----------
  const hasFav = (list, id) =>
    Array.isArray(list) &&
    list.some((f) => ((f.media && f.media._id) || f.media) === id);

  if (mediaId) {
    const fAdd = await req("POST", "/api/favorites", {
      token: tokenA,
      body: { mediaId },
    });
    record(
      "favorites add: 201/200",
      fAdd.status === 201 || fAdd.status === 200,
      `status=${fAdd.status}`
    );

    const fList1 = await req("GET", "/api/favorites", { token: tokenA });
    record(
      "favorites list: contains added favorite",
      fList1.status === 200 && hasFav(fList1.json, mediaId),
      `status=${fList1.status}`
    );

    const fDelB = await req("DELETE", `/api/favorites/${mediaId}`, {
      token: tokenB,
    });
    record(
      "favorites ownership: user B cannot delete user A's favorite (404)",
      fDelB.status === 404,
      `status=${fDelB.status}`
    );

    const fList2 = await req("GET", "/api/favorites", { token: tokenA });
    record(
      "favorites still present after ownership attempt",
      hasFav(fList2.json, mediaId),
      `status=${fList2.status}`
    );

    const fDelA = await req("DELETE", `/api/favorites/${mediaId}`, {
      token: tokenA,
    });
    record("favorites delete: 200", fDelA.status === 200, `status=${fDelA.status}`);

    const fList3 = await req("GET", "/api/favorites", { token: tokenA });
    record(
      "favorites list after delete: favorite gone",
      fList3.status === 200 && !hasFav(fList3.json, mediaId),
      `status=${fList3.status}`
    );
  } else {
    record("favorites add: 201/200", false, "no media available");
  }

  // ---------- Notifications ----------
  const nAuth = await req("GET", "/api/notifications", { token: tokenA });
  record(
    "notifications authenticated: 200 + array",
    nAuth.status === 200 && Array.isArray(nAuth.json),
    `status=${nAuth.status}`
  );
  const nNoAuth = await req("GET", "/api/notifications");
  record(
    "notifications unauthenticated: 401",
    nNoAuth.status === 401,
    `status=${nNoAuth.status}`
  );

  // ---------- Subscription plans ----------
  const plans = await req("GET", "/api/subscription-plans/plans");
  record(
    "subscription plans: 200 + array",
    plans.status === 200 && Array.isArray(plans.json),
    `status=${plans.status} count=${Array.isArray(plans.json) ? plans.json.length : "n/a"}`
  );

  // ---------- CORS (production allowlist) ----------
  const cAllowed = await req("GET", "/api/media", {
    headers: { Origin: "http://allowed.test" },
  });
  record(
    "CORS: allowlisted origin accepted",
    cAllowed.status === 200,
    `status=${cAllowed.status}`
  );
  const cDenied = await req("GET", "/api/media", {
    headers: { Origin: "https://evil.example" },
  });
  record(
    "CORS: non-allowlisted origin denied",
    cDenied.status !== 200 &&
      JSON.stringify(cDenied.json || {}).includes("CORS"),
    `status=${cDenied.status} msg=${cDenied.json && cDenied.json.message}`
  );

  // ---------- Paystack webhook signature verification ----------
  const secret = env.PAYSTACK_SECRET_KEY || "";
  const raw = JSON.stringify({
    event: "invoice.payment_failed",
    data: { reference: "phase12-noop" },
  });
  const goodSig = crypto
    .createHmac("sha512", secret)
    .update(raw)
    .digest("hex");
  const wValid = await req("POST", "/api/payments/webhook", {
    rawBody: raw,
    headers: { "x-paystack-signature": goodSig },
  });
  record(
    "paystack webhook: valid signature accepted (raw-body HMAC)",
    wValid.status === 200,
    `status=${wValid.status} msg=${wValid.text.slice(0, 80)}`
  );

  const wBad = await req("POST", "/api/payments/webhook", {
    rawBody: raw,
    headers: { "x-paystack-signature": "deadbeef" },
  });
  record(
    "paystack webhook: invalid signature rejected 400",
    wBad.status === 400,
    `status=${wBad.status}`
  );

  const wNone = await req("POST", "/api/payments/webhook", { rawBody: raw });
  record(
    "paystack webhook: missing signature rejected 400",
    wNone.status === 400,
    `status=${wNone.status}`
  );

  // ---------- Socket.IO ----------
  const sValid = await connectSocket({ token: tokenA });
  record(
    "socket.io: valid JWT accepted",
    sValid.connected === true,
    sValid.error || ""
  );

  const sMissing = await connectSocket({});
  record(
    "socket.io: missing token rejected",
    sMissing.connected === false &&
      /Authentication required/.test(sMissing.error || ""),
    sMissing.error || ""
  );

  const sInvalid = await connectSocket({ token: "bad.token.here" });
  record(
    "socket.io: invalid token rejected",
    sInvalid.connected === false &&
      /Invalid or expired token/.test(sInvalid.error || ""),
    sInvalid.error || ""
  );

  const alive = await req("GET", "/health");
  record(
    "socket.io: server alive after rejected handshakes",
    alive.status === 200 && alive.json.database.readyState === 1,
    `status=${alive.status}`
  );

  summarize();
})().catch((e) => {
  console.error("HARNESS ERROR:", e);
  process.exit(2);
});

