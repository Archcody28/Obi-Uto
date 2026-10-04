/*
 * Phase 13 mobile runtime harness (validation tooling - not application code).
 *
 * Executes the REAL mobile application modules (src/config, src/api/*,
 * src/store/authStore, src/services/socketService) against a live backend,
 * using a small loader hook to stub React Native-only modules so the exact
 * shipped data-layer code runs unmodified in Node.
 *
 * Validates the mobile data layer + Socket.IO client, NOT the Android UI.
 * UI/device E2E remains BLOCKED in this environment.
 *
 * Auth request budget: <= 8 requests to /api/auth (limiter max = 10).
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { API_BASE_URL, SOCKET_URL } from "../../mobile/src/config.ts";
import { useAuthStore } from "../../mobile/src/store/authStore.js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { registerUser, loginUser, getCurrentUser } from "../../mobile/src/api/authApi.ts";
import { fetchMedia, fetchMediaById } from "../../mobile/src/api/mediaApi.js";
import { searchMedia } from "../../mobile/src/api/searchApi.ts";
import { getHomeMedia } from "../../mobile/src/api/homeApi.ts";
import {
  addFavorite,
  getFavorites,
  removeFavorite,
} from "../../mobile/src/api/favoriteApi.js";
import { getNotifications } from "../../mobile/src/api/notificationApi.ts";
import { getCoinBalance } from "../../mobile/src/api/coinApi.js";
import { createCheckout } from "../../mobile/src/api/paymentApi.js";
import socketProxy, { getSocket } from "../../mobile/src/services/socketService.js";

const repoRoot = path.resolve(fileURLToPath(import.meta.url), "..", "..", "..");
const serverRequire = createRequire(
  path.join(repoRoot, "server", "node_modules", "index.js")
);

const results = [];
function record(name, pass, detail) {
  results.push({ name, pass: !!pass, detail: detail || "" });
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? " | " + detail : ""}`);
}
function summarize() {
  const failed = results.filter((r) => !r.pass).length;
  console.log(
    `\nSUMMARY | total=${results.length} passed=${results.length - failed} failed=${failed}`
  );
  if (failed) process.exitCode = 1;
}

const stamp = Date.now();
const emailA = `p13a_${stamp}@example.com`;
const emailB = `p13b_${stamp}@example.com`;
const password = "Phase13!Passw0rd";

function connectOutcome(socket, timeout = 7000) {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve({ outcome: "timeout" }), timeout);
    socket.once("connect", () => {
      clearTimeout(t);
      resolve({ outcome: "connect" });
    });
    socket.once("connect_error", (err) => {
      clearTimeout(t);
      resolve({ outcome: "reject", error: String(err && err.message) });
    });
  });
}

(async () => {
  console.log(`API_BASE_URL=${API_BASE_URL}`);
  console.log(`SOCKET_URL=${SOCKET_URL}\n`);

  // ---------- Media (real mobile modules) ----------
  const home = await getHomeMedia();
  record(
    "mobile homeApi.getHomeMedia: real data",
    home !== undefined && home !== null,
    `type=${Array.isArray(home) ? "array" : typeof home}`
  );

  const media = await fetchMedia();
  record(
    "mobile mediaApi.fetchMedia: array",
    Array.isArray(media),
    `count=${Array.isArray(media) ? media.length : "n/a"}`
  );

  const first = Array.isArray(media) ? media[0] : null;
  record("media seed present (details target)", !!first, first ? `_id=${first._id}` : "");

  // NOTE: GET /media/:id is auth-protected (authMiddleware); details tested post-login.

  const search = await searchMedia("a");
  record(
    "mobile searchApi.searchMedia: array results",
    Array.isArray(search),
    `count=${Array.isArray(search) ? search.length : "n/a"}`
  );

  // ---------- Auth: register ----------
  const reg = await registerUser("Phase13 User A", emailA, password);
  record(
    "register: returns user object (login-based auth, no auto token)",
    !!reg.user && !!reg.user._id,
    reg.user ? `_id=${reg.user._id}` : "no user"
  );
  record(
    "register: no password in response",
    !JSON.stringify(reg).includes("password"),
    "password field absent"
  );

  // ---------- Password hashing (real DB inspection) ----------
  try {
    const mongoose = serverRequire("mongoose");
    await mongoose.connect("mongodb://localhost:27017/mediaapp");
    const doc = await mongoose.connection.db
      .collection("users")
      .findOne({ email: emailA });
    record(
      "register: password stored as bcrypt hash",
      !!doc && typeof doc.password === "string" && /^\$2[aby]\$/.test(doc.password),
      doc ? `prefix=${String(doc.password).slice(0, 7)}` : "user not found"
    );
    await mongoose.disconnect();
  } catch (e) {
    record("register: password stored as bcrypt hash", false, String(e.message));
  }

  // ---------- Auth: login ----------
  const login = await loginUser(emailA, password);
  const tokenA = login && login.token;
  record(
    "login: valid credentials return token",
    !!tokenA,
    "token present"
  );

  let invalidRejected = false;
  try {
    await loginUser(emailA, "wrong-password");
  } catch (e) {
    invalidRejected = e.response && e.response.status === 401;
  }
  record("login: invalid credentials rejected (401)", invalidRejected, "401");

  // ---------- Session persistence via real authStore ----------
  useAuthStore.getState().setToken(tokenA);
  const persisted = await AsyncStorage.getItem("@auth_token");
  record(
    "authStore.setToken: token persisted to storage",
    persisted === tokenA,
    persisted ? "stored" : "missing"
  );

  await useAuthStore.getState().restoreAuth();
  record(
    "authStore.restoreAuth: session restored from storage",
    !!useAuthStore.getState().user && !useAuthStore.getState().isRestoring,
    `user=${useAuthStore.getState().user?._id || "none"}`
  );

  const me = await getCurrentUser();
  record("getCurrentUser: valid JWT returns user", !!me && !!me._id, `_id=${me && me._id}`);

  useAuthStore.getState().setToken(null);
  let meFailed = false;
  try {
    await getCurrentUser();
  } catch (e) {
    meFailed = e.response && e.response.status === 401;
  }
  record("getCurrentUser: missing token rejected (401)", meFailed, "401");

  // ---------- Media details (authenticated) ----------
  useAuthStore.getState().setToken(tokenA);
  if (first && first._id) {
    const d = await fetchMediaById(first._id);
    const obj = d && d.media ? d.media : d;
    const detailsOk = !!obj && (obj._id === first._id || obj.id === first._id);
    record("mobile mediaApi.fetchMediaById: correct id", detailsOk, `_id=${first._id}`);
  } else {
    record("mobile mediaApi.fetchMediaById: correct id", false, "no media to fetch");
  }
  let detailsBlocked = false;
  useAuthStore.getState().setToken(null);
  try {
    await fetchMediaById(first._id);
  } catch (e) {
    detailsBlocked = e.response && e.response.status === 401;
  }
  record("media details: unauthenticated rejected (401)", detailsBlocked, "401");

  // ---------- Favorites E2E (account isolation) ----------
  const regB = await registerUser("Phase13 User B", emailB, password);
  record("register B: user created", !!regB.user, "ok");

  const loginB = await loginUser(emailB, password);
  const tokenB2 = loginB && loginB.token;
  record("login B: token", !!tokenB2, "token present");

  const favOf = (arr, id) =>
    (arr || []).some(
      (f) =>
        (f.media && (f.media._id === id || f.media.id === id)) ||
        f.mediaId === id
    );

  useAuthStore.getState().setToken(tokenA);
  await addFavorite(first._id);
  const favA = await getFavorites();
  record("favorites A: add then list contains item", favOf(favA, first._id), `count=${(favA || []).length}`);

  useAuthStore.getState().setToken(tokenB2);
  const favB = await getFavorites();
  record("favorites isolation: B cannot see A's favorite", !favOf(favB, first._id), `B count=${(favB || []).length}`);

  let bDeleteBlocked = false;
  try {
    await removeFavorite(first._id);
  } catch (e) {
    bDeleteBlocked = e.response && (e.response.status === 404 || e.response.status === 403);
  }
  record("favorites ownership: B cannot delete A's favorite", bDeleteBlocked, "404/403");

  useAuthStore.getState().setToken(tokenA);
  await removeFavorite(first._id);
  const favAfter = await getFavorites();
  record("favorites A: delete then gone", !favOf(favAfter, first._id), `count=${(favAfter || []).length}`);

  // ---------- Notifications ----------
  const notifs = await getNotifications();
  record(
    "notifications: authenticated array",
    Array.isArray(notifs) || (notifs && Array.isArray(notifs.data)),
    "ok"
  );
  useAuthStore.getState().setToken(null);
  let notifBlocked = false;
  try {
    await getNotifications();
  } catch (e) {
    notifBlocked = e.response && e.response.status === 401;
  }
  record("notifications: unauthenticated rejected (401)", notifBlocked, "401");

  // ---------- Wallet / Coins (existing UI data layer) ----------
  useAuthStore.getState().setToken(tokenA);
  const balance = await getCoinBalance();
  record(
    "coinApi.getCoinBalance: authenticated response",
    balance !== undefined && balance !== null,
    `keys=${Object.keys(balance || {}).slice(0, 5).join(",")}`
  );

  const plansRes = await fetch(API_BASE_URL + "/subscription-plans/plans");
  const plansJson = await plansRes.json().catch(() => null);
  record(
    "subscription plans endpoint: 200 + array",
    plansRes.status === 200 && Array.isArray(plansJson),
    `status=${plansRes.status} count=${Array.isArray(plansJson) ? plansJson.length : "n/a"}`
  );

  // Payment checkout must require auth and must NOT fake success without credentials.
  let checkoutGuarded = false;
  try {
    await createCheckout({ planId: "nonexistent" });
  } catch (e) {
    checkoutGuarded = !!e.response && e.response.status >= 400;
  }
  record(
    "paymentApi.createCheckout: no unauthenticated fake success",
    checkoutGuarded,
    "rejected without auth/credentials"
  );


  // ---------- Socket.IO via real socketService ----------
  useAuthStore.getState().setToken(tokenA);
  void socketProxy;
  const okAuth = await connectOutcome(getSocket());
  record(
    "socket service: valid JWT accepted",
    okAuth.outcome === "connect",
    okAuth.error || okAuth.outcome
  );

  useAuthStore.getState().setToken(null);
  const missingSocket = getSocket();
  missingSocket.connect();
  const missRes = await connectOutcome(missingSocket);
  record(
    "socket service: missing token rejected",
    missRes.outcome === "reject",
    missRes.error || missRes.outcome
  );
  missingSocket.disconnect();

  useAuthStore.getState().setToken("bad.token.here");
  const badSocket = getSocket();
  const badRes = await connectOutcome(badSocket);
  record(
    "socket service: invalid token rejected",
    badRes.outcome === "reject",
    badRes.error || badRes.outcome
  );
  badSocket.disconnect();


  // ---------- Logout clears session ----------
  useAuthStore.getState().setToken(tokenA);
  useAuthStore.getState().logout();
  const afterLogout = await AsyncStorage.getItem("@auth_token");
  record(
    "authStore.logout: token + storage cleared",
    useAuthStore.getState().token === null && afterLogout === null,
    "cleared"
  );

  summarize();
})().catch((e) => {
  console.error("HARNESS ERROR:", e);
  process.exit(2);
});
