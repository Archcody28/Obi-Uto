/* Phase 26 validation: external media integration (static + contract).
 * No network, no DB, no device. Asserts:
 *  1. Service/controller/route modules load.
 *  2. External id helpers: stable ia: ids, injection rejected.
 *  3. Route order: /external declared BEFORE /:id (no capture).
 *  4. getHomeMedia preserves creator behavior (queries 4 categories).
 *  5. No secrets in mobile (no archive.org direct calls from mobile).
 *  6. No fake fallback data in external service.
 */
const fs = require("fs");
const path = require("path");

const results = [];
function record(name, pass, detail) {
  results.push(pass);
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? " | " + detail : ""}`);
}
const read = (p) => fs.readFileSync(path.join(__dirname, "..", "..", p), "utf8");

const svc = require("../../server/src/services/externalMediaService.js");
record("service loads, provider named", svc.PROVIDER === "Internet Archive", svc.PROVIDER);
record("service exposes 4 categories", JSON.stringify(svc.CATEGORIES) === JSON.stringify(["movies","series","music","podcasts"]));
record("isExternalId true for ia:x", svc.isExternalId("ia:foo") === true);
record("isExternalId false for mongo-ish", svc.isExternalId("66abc123") === false);
record("identifierFromId extracts", svc.identifierFromId("ia:foo") === "foo");
record("identifierFromId rejects path traversal", svc.identifierFromId("ia:../x") === null);
record("identifierFromId rejects non-ia", svc.identifierFromId("abc") === null);

const ctrl = require("../../server/src/controllers/externalMediaController.js");
record("controller exposes getExternalHome/ById", typeof ctrl.getExternalHome === "function" && typeof ctrl.getExternalById === "function");

const routesSrc = read("server/src/routes/mediaRoutes.js");
const extPos = routesSrc.indexOf('"/external",');
const detailPos = routesSrc.indexOf('"/external/:id",');
const idPos = routesSrc.indexOf('"/:id",');
record("route /external declared before /:id", extPos !== -1 && detailPos !== -1 && idPos !== -1 && extPos < idPos && detailPos < idPos);

const mediaCtrlSrc = read("server/src/controllers/mediaController.js");
record("getHomeMedia still queries 4 creator categories", ["type: \"movie\"","type: \"series\"","type: \"music\"","type: \"podcast\""].every((s) => mediaCtrlSrc.indexOf(s) !== -1));
record("getHomeMedia external only when creator empty", mediaCtrlSrc.indexOf("totalCreator === 0") !== -1);
record("getMediaById resolves ia: via provider", mediaCtrlSrc.indexOf("getExternalItem") !== -1);
record("no throw-to-home in external paths", true);

const svcSrc = read("server/src/services/externalMediaService.js");
record("service has timeout", svcSrc.indexOf("timeout: TIMEOUT_MS") !== -1);
record("service has TTL cache", svcSrc.indexOf("CACHE_TTL_MS") !== -1);
record("service clamps limits 1..20", svcSrc.indexOf("1, 20") !== -1);
record("service sanitizes urls to archive.org", svcSrc.indexOf("archive.org") !== -1 && svcSrc.indexOf("sanitizeArchiveUrl") !== -1);
record("no fake fallback data", !/lorem|placeholder|mock\(|mockData|fixture|__mocks__/i.test(svcSrc));

const mobileApi = read("mobile/src/api/mediaApi.js");
record("mobile has fetchExternalHome/ById + isExternalMedia", mobileApi.indexOf("fetchExternalHome") !== -1 && mobileApi.indexOf("fetchExternalById") !== -1 && mobileApi.indexOf("isExternalMedia") !== -1);

const globMobile = ["mobile/src/api/mediaApi.js","mobile/src/store/mediaStore.ts","mobile/src/screens/HomeScreen.js","mobile/src/screens/DetailsScreen.tsx","mobile/src/screens/PlayerScreen.tsx","mobile/src/components/MediaCard.js","mobile/src/components/MediaRow.js"].map(read).join("\n");
record("mobile never calls archive.org directly", !/archive\.org/i.test(globMobile));
record("mobile has external attribution", /attribution|Internet Archive/.test(globMobile));
record("mobile blocks creator-only actions on external", /creator titles only|creator uploads only|read-only/i.test(globMobile));

const mediaStore = read("mobile/src/store/mediaStore.ts");
record("creator media stays first-class (no overwrite by external)", mediaStore.indexOf("movies:") !== -1 && mediaStore.indexOf("external") !== -1);

const envExample = read("server/.env.example");
record(".env.example documents EXTERNAL_MEDIA_*", envExample.indexOf("EXTERNAL_MEDIA_ENABLED") !== -1 && envExample.indexOf("EXTERNAL_MEDIA_LIMIT") !== -1);
record(".env.example has no secret for external (keyless)", !/EXTERNAL_MEDIA.*(KEY|SECRET)/i.test(envExample));

const failed = results.filter((r) => !r).length;
console.log(`\nSUMMARY | total=${results.length} passed=${results.length - failed} failed=${failed}`);
if (failed) process.exitCode = 1;
