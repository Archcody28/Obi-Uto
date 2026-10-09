"use strict";

/**
 * PHASE 26 — External media integration (Internet Archive).
 *
 * Provider: Internet Archive (archive.org)
 *  - AdvancedSearch API (https://archive.org/advancedsearch.php) — no key.
 *  - Metadata API (https://archive.org/metadata/<identifier>) — no key.
 *  - Files: https://archive.org/download/<id>/<file>
 *  - Thumbnails: https://archive.org/services/img/<id>
 * Why: keyless server-to-server JSON, full-length public-domain / CC media
 *  with direct MP4/MP3 playback, per-item license metadata, no mobile secret.
 * Limits: be a good citizen — TTL cache, bounded limits, 8s timeouts.
 * Licensing: each item carries `license` + `attribution` (UIs must render).
 * Env: EXTERNAL_MEDIA_ENABLED (default "true"), EXTERNAL_MEDIA_TIMEOUT_MS
 *  (default 8000), EXTERNAL_MEDIA_CACHE_TTL_MS (default 600000),
 *  EXTERNAL_MEDIA_LIMIT (default 8 per category, clamped 1..20).
 * Fallback: provider failure -> { items: [], unavailable: true } (home) or
 *  null (detail). Never throws to Home, never fake data.
 */

const axios = require("axios");

const PROVIDER = "Internet Archive";
const SEARCH_URL = "https://archive.org/advancedsearch.php";
const METADATA_URL = "https://archive.org/metadata/";
const DOWNLOAD_BASE = "https://archive.org/download/";
const IMAGE_BASE = "https://archive.org/services/img/";

function clampInt(raw, fallback, min, max) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

const TIMEOUT_MS = clampInt(process.env.EXTERNAL_MEDIA_TIMEOUT_MS, 8000, 1000, 20000);
const CACHE_TTL_MS = clampInt(process.env.EXTERNAL_MEDIA_CACHE_TTL_MS, 600000, 60000, 3600000);
const DEFAULT_LIMIT = clampInt(process.env.EXTERNAL_MEDIA_LIMIT, 8, 1, 20);

function isEnabled() {
  return String(process.env.EXTERNAL_MEDIA_ENABLED || "true").toLowerCase() !== "false";
}

// Small in-memory TTL cache (existing infra only — no Redis).
const cache = new Map();
function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}
function cacheSet(key, value) {
  if (cache.size > 200) cache.clear();
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

// Curated, license-friendly collections. One provider, bounded queries.
const CATEGORIES = {
  movies: { query: "collection:(feature_films) AND mediatype:(movies)", sort: "downloads desc" },
  series: { query: "collection:(classic_tv) AND mediatype:(movies)", sort: "downloads desc" },
  music: { query: "collection:(netlabels) AND mediatype:(audio)", sort: "downloads desc" },
  podcasts: { query: "collection:(old_time_radio) AND mediatype:(audio)", sort: "downloads desc" },
};

const TYPE_BY_CATEGORY = { movies: "movie", series: "series", music: "music", podcasts: "podcast" };

function sanitizeText(value, maxLen) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, maxLen);
}

function sanitizeIdentifier(value) {
  if (typeof value !== "string") return null;
  const v = value.trim().slice(0, 200);
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(v)) return null;
  return v;
}

function sanitizeArchiveUrl(raw, identifier) {
  if (typeof raw !== "string") return null;
  const v = raw.trim().slice(0, 2000);
  if (!/^https:\/\//i.test(v)) return null;
  let parsed;
  try {
    parsed = new URL(v);
  } catch (err) {
    return null;
  }
  const host = parsed.hostname.toLowerCase();
  const okHost =
    host === "archive.org" ||
    host.endsWith(".archive.org") ||
    host.endsWith(".us.archive.org");
  if (!okHost) return null;
  if (identifier && parsed.pathname.indexOf("/download/") === 0 &&
      parsed.pathname.indexOf("/download/" + identifier + "/") !== 0 &&
      parsed.pathname.indexOf("/download/" + identifier) !== 0) return null;
  return parsed.href;
}

function attributionFor(identifier, license) {
  const rights = license || "rights unverified — see item page";
  return "Provided by Internet Archive — " + identifier + " (" + rights + ")";
}

function baseItem(category, doc) {
  const identifier = sanitizeIdentifier(doc && doc.identifier);
  if (!identifier) return null;
  const title = sanitizeText(doc.title, 200) || identifier;
  const rawDesc = Array.isArray(doc.description) ? doc.description.join(" ") : doc.description;
  const rawLic = Array.isArray(doc.licenseurl) ? doc.licenseurl[0] : doc.licenseurl;
  const description = sanitizeText(rawDesc, 1000);
  const license = sanitizeText(rawLic, 300);
  const yearRaw = Array.isArray(doc.year) ? doc.year[0] : doc.year;
  const year = parseInt(yearRaw, 10);
  return {
    _id: "ia:" + identifier, id: "ia:" + identifier,
    source: "external", provider: PROVIDER, externalId: identifier,
    externalUrl: "https://archive.org/details/" + encodeURIComponent(identifier),
    type: TYPE_BY_CATEGORY[category] || "movie",
    title, description,
    thumbnail: IMAGE_BASE + encodeURIComponent(identifier),
    banner: IMAGE_BASE + encodeURIComponent(identifier),
    releaseYear: Number.isFinite(year) ? year : undefined,
    genre: [], license: license || null,
    attribution: attributionFor(identifier, license || null),
    isPremium: false, maturityRating: "G", views: 0, rating: 0,
    videoUrl: null, audioUrl: null, playbackUrl: null, downloadUrl: null,
  };
}

function pickPlayableFile(identifier, files) {
  if (!Array.isArray(files)) return null;
  const videoExts = ["mp4", "ogv", "webm", "m4v"];
  const audioExts = ["mp3", "ogg", "oga", "m4a", "flac", "wav", "opus"];
  const cands = [];
  for (const f of files) {
    if (!f || typeof f.name !== "string") continue;
    const name = f.name;
    if (name.indexOf("/") !== -1) continue;
    const dot = name.lastIndexOf(".");
    const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
    const isVideo = videoExts.indexOf(ext) !== -1;
    const isAudio = audioExts.indexOf(ext) !== -1;
    if (!isVideo && !isAudio) continue;
    const src = typeof f.source === "string" ? f.source : "";
    cands.push({ name, ext, isVideo, orig: src === "original" ? 0 : 1, size: Number(f.size) || 0 });
  }
  const rank = (e) => ({ mp4: 0, mp3: 0, ogg: 1, oga: 1, ogv: 2, webm: 2, m4a: 3 }[e] || 9);
  cands.sort((a, b) => (a.orig - b.orig) || ((b.isVideo ? 1 : 0) - (a.isVideo ? 1 : 0)) || (rank(a.ext) - rank(b.ext)) || (b.size - a.size));
  const best = cands[0];
  if (!best) return null;
  const playUrl = DOWNLOAD_BASE + encodeURIComponent(identifier) + "/" + encodeURI(best.name);
  return { url: sanitizeArchiveUrl(playUrl, identifier), isVideo: best.isVideo };
}

async function getExternalItem(identifier) {
  const clean = sanitizeIdentifier(identifier);
  if (!clean) return null;
  const key = "ext:item:" + clean;
  const hit = cacheGet(key);
  if (hit) return hit;
  const res = await axios.get(METADATA_URL + encodeURIComponent(clean), {
    params: { output: "json" }, timeout: TIMEOUT_MS,
  });
  const data = res.data || {};
  const meta = data.metadata || {};
  const one = (v) => (Array.isArray(v) ? v[0] : v);
  const mt = sanitizeText(one(meta.mediatype), 40).toLowerCase();
  const category = mt === "audio" ? "music" : "movies";
  const item = baseItem(category, {
    identifier: clean, title: one(meta.title), description: one(meta.description),
    licenseurl: one(meta.licenseurl), year: one(meta.year),
  });
  if (!item) return null;
  const playable = pickPlayableFile(clean, data.files);
  if (playable && playable.url) {
    item.playbackUrl = playable.url;
    item.videoUrl = playable.url;
    item.downloadUrl = playable.url;
    if (!playable.isVideo) {
      item.audioUrl = playable.url;
      if (item.type === "movie") item.type = "music";
    }
  }
  cacheSet(key, item);
  return item;
}

async function fetchCategory(category, limit) {
  const def = CATEGORIES[category];
  const key = "ext:" + category + ":" + limit;
  const hit = cacheGet(key);
  if (hit) return hit;
  const res = await axios.get(SEARCH_URL, {
    params: {
      q: def.query, "fl[]": ["identifier", "title", "description", "licenseurl", "year"],
      rows: limit, page: 1, output: "json", sort: [def.sort],
    },
    timeout: TIMEOUT_MS,
  });
  const docs = (res.data && res.data.response && res.data.response.docs) || [];
  const items = [];
  for (const doc of docs) {
    if (items.length >= limit) break;
    try {
      const full = await getExternalItem(doc.identifier);
      if (full) {
        full.type = TYPE_BY_CATEGORY[category] || full.type;
        items.push(full);
        continue;
      }
    } catch (err) { /* fall through to base row */ }
    const base = baseItem(category, doc);
    if (base) items.push(base);
  }
  cacheSet(key, items);
  return items;
}

async function getExternalHome(limit) {
  const per = clampInt(limit, DEFAULT_LIMIT, 1, 20);
  const out = { movies: [], series: [], music: [], podcasts: [], unavailable: false, provider: PROVIDER };
  if (!isEnabled()) {
    out.unavailable = true;
    return out;
  }
  const keys = Object.keys(CATEGORIES);
  const settled = await Promise.allSettled(keys.map((k) => fetchCategory(k, per)));
  settled.forEach((r, i) => {
    if (r.status === "fulfilled" && Array.isArray(r.value)) out[keys[i]] = r.value;
    else out[keys[i]] = [];
  });
  const total = out.movies.length + out.series.length + out.music.length + out.podcasts.length;
  if (total === 0) out.unavailable = true;
  return out;
}

async function searchExternal(query, limit) {
  const per = clampInt(limit, 10, 1, 20);
  const clean = sanitizeText(query, 100).trim();
  if (!clean) return { items: [], unavailable: false };
  if (!isEnabled()) return { items: [], unavailable: true };
  // Single provider request (bounded): full-text query restricted to
  // audio/video mediatypes; rows clamped. Never throws — caller merges.
  const key = "ext:search:" + clean.toLowerCase() + ":" + per;
  const hit = cacheGet(key);
  if (hit) return hit;
  try {
    const res = await axios.get(SEARCH_URL, {
      params: {
        q: "(" + clean.replace(/[()]/g, "") + ") AND mediatype:(movies OR audio)",
        "fl[]": ["identifier", "title", "description", "licenseurl", "year", "mediatype"],
        rows: per, page: 1, output: "json",
      },
      timeout: TIMEOUT_MS,
    });
    const docs = (res.data && res.data.response && res.data.response.docs) || [];
    const items = [];
    const seenIds = new Set();
    for (const doc of docs) {
      if (items.length >= per) break;
      // Never expose raw provider objects: normalize through baseItem only.
      // Malformed rows (bad identifier) are skipped, never faked.
      try {
        const mt = String(
          Array.isArray(doc.mediatype) ? doc.mediatype[0] : doc.mediatype || ""
        ).toLowerCase();
        const category = mt.indexOf("audio") !== -1 ? "music" : "movies";
        const base = baseItem(category, doc);
        if (!base || seenIds.has(base._id)) continue;
        seenIds.add(base._id);
        items.push(base);
      } catch (rowErr) { /* skip malformed row */ }
    }
    const out = { items, unavailable: false };
    cacheSet(key, out);
    return out;
  } catch (err) {
    return { items: [], unavailable: true };
  }
}

module.exports = {
  PROVIDER,
  CATEGORIES: Object.keys(CATEGORIES),
  getExternalHome,
  getExternalItem,
  searchExternal,
  isExternalId: (id) => typeof id === "string" && id.indexOf("ia:") === 0,
  identifierFromId: (id) => {
    if (typeof id !== "string" || id.indexOf("ia:") !== 0) return null;
    return sanitizeIdentifier(id.slice(3));
  },
};
