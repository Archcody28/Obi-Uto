/* Phase 27 validation: unified search (static + contract, no network/DB/device).
 * Asserts creator+external merge, honest failure behavior, and mobile states.
 */
const fs = require("fs");
const path = require("path");

const results = [];
function record(name, pass, detail) {
  results.push(pass);
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? " | " + detail : ""}`);
}
const read = (p) => fs.readFileSync(path.join(__dirname, "..", "..", p), "utf8");

(async () => {
  const svc = require("../../server/src/services/externalMediaService.js");
  record("service exposes searchExternal", typeof svc.searchExternal === "function");
  const mcSrc = read("server/src/controllers/mediaController.js");
  record("search returns unified contract", mcSrc.indexOf("creatorCount") !== -1 && mcSrc.indexOf("externalCount") !== -1 && mcSrc.indexOf("externalUnavailable") !== -1);
  record("empty query rejected honestly", mcSrc.indexOf("Search query is required") !== -1);
  record("creator filtered published+visible", mcSrc.indexOf('status: "published"') !== -1 && mcSrc.indexOf("isHidden") !== -1);
  record("single provider call per search", (mcSrc.match(/searchExternal/g) || []).length === 1);
  record("provider failure keeps creator results", mcSrc.indexOf("externalUnavailable = true") !== -1);
  record("external ids stay ia:-namespaced", mcSrc.indexOf('indexOf("ia:")') !== -1);
  record("no raw provider leak", mcSrc.indexOf("res.json({") !== -1 && mcSrc.indexOf("response.docs") === -1);

  // Live contract checks with stubbed Media + provider (no network, no DB).
  const mc = require("../../server/src/controllers/mediaController.js");
  const mkRes = () => { const r = { statusCode: 200 }; r.status = (c) => { r.statusCode = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; };
  let req = { query: { q: "   " } }; let res = mkRes();
  await mc.searchMedia(req, res);
  record("empty query -> 400 + empty contract", res.statusCode === 400 && Array.isArray(res.body.results) && res.body.results.length === 0);

  const mongoose = require("../../server/node_modules/mongoose");
  const Media = mongoose.model("Media");
  const origFind = Media.find;
  const origSearch = svc.searchExternal;

  Media.find = () => ({ limit: () => ({ lean: () => Promise.resolve([{ _id: "c1", title: "Alpha" }, { _id: "c2", title: "Zulu" }]) }) });
  svc.searchExternal = async () => ({ items: [{ _id: "ia:a", source: "external", provider: "Internet Archive", externalId: "a", title: "A", attribution: "attr" }], unavailable: false });
  req = { query: { q: "a" } }; res = mkRes();
  await mc.searchMedia(req, res);
  record("mixed: creator first, counts honest", res.statusCode === 200 && res.body.creatorCount === 2 && res.body.externalCount === 1 && String(res.body.results[0]._id) === "c1");
  record("mixed: no fake creator ids on external", res.body.results.every((r) => r.source !== "external" || (String(r._id).indexOf("ia:") === 0 && r.creatorId === undefined)));

  svc.searchExternal = async () => { throw new Error("down"); };
  req = { query: { q: "a" } }; res = mkRes();
  await mc.searchMedia(req, res);
  record("provider failure: creator survives + unavailable flag", res.statusCode === 200 && res.body.results.length === 2 && res.body.externalUnavailable === true);

  Media.find = () => ({ limit: () => ({ lean: () => Promise.resolve([]) }) });
  svc.searchExternal = async () => ({ items: [{ _id: "ia:solo", source: "external", provider: "Internet Archive", externalId: "solo", title: "Solo", attribution: "attr" }], unavailable: false });
  req = { query: { q: "solo" } }; res = mkRes();
  await mc.searchMedia(req, res);
  record("external-only: contract holds", res.statusCode === 200 && res.body.creatorCount === 0 && res.body.externalCount === 1);

  Media.find = origFind; svc.searchExternal = origSearch;

  const searchApi = read("mobile/src/api/searchApi.ts");
  record("mobile normalizes object+legacy array", searchApi.indexOf("Array.isArray(data)") !== -1 && searchApi.indexOf("externalUnavailable") !== -1);
  record("mobile single request (params, no string concat)", searchApi.indexOf("{ params:") !== -1 && searchApi.indexOf("`/media/search?q=") === -1);
  const screen = read("mobile/src/screens/SearchScreen.tsx");
  record("mobile debounces typing", screen.indexOf("setTimeout") !== -1 && screen.indexOf("500") !== -1);
  record("mobile has loading state", screen.indexOf("Searching...") !== -1);
  record("mobile has empty state", screen.indexOf("No results found") !== -1);
  record("mobile has error + retry", screen.indexOf("Tap to retry") !== -1);
  record("mobile shows provider attribution state", screen.indexOf("Internet Archive results unavailable") !== -1);
  record("mobile reuses MediaCard (no duplicate screen)", screen.indexOf("MediaCard") !== -1 && screen.indexOf("searchExternal") === -1);
  record("no archive.org direct calls from search mobile", !/archive\.org/i.test(searchApi + screen));

  const failed = results.filter((r) => !r).length;
  console.log(`\nSUMMARY | total=${results.length} passed=${results.length - failed} failed=${failed}`);
  if (failed) process.exitCode = 1;
})().catch((e) => { console.error("FAIL | harness error | " + (e && e.message)); process.exitCode = 1; });
