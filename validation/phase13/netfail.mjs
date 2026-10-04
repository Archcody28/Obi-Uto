/*
 * Phase 13 network-failure probe (validation tooling).
 * Runs the real mobile api client against an UNREACHABLE backend and asserts
 * it rejects (surfaces an error) rather than resolving with stale/mock data.
 */
import { fetchMedia } from "../../mobile/src/api/mediaApi.js";
import { getHomeMedia } from "../../mobile/src/api/homeApi.ts";
import { API_BASE_URL } from "../../mobile/src/config.ts";

const results = [];
function record(name, pass, detail) {
  results.push(pass);
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? " | " + detail : ""}`);
}

console.log(`API_BASE_URL=${API_BASE_URL} (dead backend)`);

let mediaRejected = false;
let mediaValue = null;
try {
  mediaValue = await fetchMedia();
} catch (e) {
  mediaRejected = true;
}
record(
  "offline: fetchMedia rejects (no fabricated data)",
  mediaRejected,
  mediaRejected ? "rejected" : `resolved=${JSON.stringify(mediaValue).slice(0, 40)}`
);

let homeRejected = false;
try {
  await getHomeMedia();
} catch (e) {
  homeRejected = true;
}
record("offline: getHomeMedia rejects (no fabricated data)", homeRejected, homeRejected ? "rejected" : "resolved");

const failed = results.filter((r) => !r).length;
console.log(`\nSUMMARY | total=${results.length} passed=${results.length - failed} failed=${failed}`);
if (failed) process.exitCode = 1;
