"use strict";

/**
 * Downloadable media representation helper.
 *
 * The Media contract historically carried a single `videoUrl` used for BOTH
 * playback and offline download. That conflates two different things:
 * playback URLs may be streaming manifests (HLS `.m3u8` / DASH `.mpd`) which
 * are playlists referencing remote segments, not downloadable files.
 *
 * This module computes an explicit, honest `downloadUrl` for a media record:
 *  - original direct file (e.g. an uploaded MP4) is reused as-is, when it is
 *    already a downloadable single file;
 *  - a Cloudinary-hosted video asset gets the provider-supported MP4 delivery
 *    URL (the `.mp4` / `f_mp4` format transformation of the stored asset);
 *  - streaming manifests that have no single-file representation return null
 *    so clients can keep an honest "not available offline" state.
 *
 * No HLS-to-MP4 conversion happens on device and no local file is faked.
 */

const AUDIO_EXTS = new Set([
  "mp3", "m4a", "m4b", "aac", "wav", "ogg", "opus", "flac", "mid", "aiff", "wma",
]);

const IMAGE_EXTS = new Set([
  "jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "avif", "heic", "tiff",
]);

// Cloudinary transformation components look like `component_value` and can
// appear before the version/public id in a delivery URL (e.g. `sp_auto`,
// `f_m3u8`, `fl_streaming_playlist`). Folder names are kept unless a version
// boundary (`v123...`) is present, which is how Cloudinary orders URLs:
// /<cloud>/<type>/<delivery>/<transformations>/<version>/<public_id>.<ext>
const COMPONENT_RE =
  /^(?:a|ac|ar|b|bo|c|cm|co|cs|dn|dpr|du|e|eu|f|fl|g|hl|h|o|pg|pi|q|r|si|so|sp|t|u|vc|vid|w|x|y|z)_[^/]+$/;

const VERSION_RE = /^v\d+$/;

function lastSegment(pathname) {
  const parts = String(pathname || "").split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "";
}

function extensionOfSegment(segment) {
  const value = String(segment || "");
  const dot = value.lastIndexOf(".");
  if (dot <= 0 || dot === value.length - 1) return "";
  return value.slice(dot + 1).toLowerCase();
}

function parseHttpUrl(raw) {
  const url = String(raw || "").trim();
  if (!/^https?:\/\//i.test(url)) return null;
  try {
    return new URL(url);
  } catch (err) {
    return null;
  }
}

function isCloudinaryHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  return host === "res.cloudinary.com" || host.endsWith(".cloudinary.com");
}

const DELIVERY_TYPES = new Set([
  "upload", "fetched", "fetch", "private", "authenticated", "live",
]);

/**
 * Split a Cloudinary video delivery URL into segments, or null when the URL
 * is not a Cloudinary-hosted video asset. Structure:
 *   /<cloud>/<asset_type>/<delivery_type>/<transformations>/<version>/<public_id>.<ext>
 * The delivery type may be omitted (defaults to upload).
 */
function cloudinaryVideoSegments(parsed) {
  if (!isCloudinaryHost(parsed.hostname)) return null;
  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments.length < 2 || segments[1] !== "video") return null;
  return segments;
}

function isCloudinaryVideo(parsed) {
  return cloudinaryVideoSegments(parsed) !== null;
}


function replaceFinalExtension(parsed, extension) {
  const pathname = parsed.pathname;
  const lastSlash = pathname.lastIndexOf("/");
  const segment = pathname.slice(lastSlash + 1);
  const dot = segment.lastIndexOf(".");
  const base = dot > 0 ? segment.slice(0, dot) : segment;
  const next = pathname.slice(0, lastSlash + 1) + base + "." + extension;
  return parsed.origin + next + parsed.search;
}

/**
 * Build the MP4 delivery URL for a Cloudinary-hosted video asset.
 *
 * Cloudinary treats the URL extension as the requested delivery format, so a
 * stored video can be delivered as an MP4 file by requesting the `.mp4`
 * extension (the `f_mp4` format transformation). Streaming-only components
 * (e.g. `sp_auto`, `fl_streaming_playlist`) are removed so the result is a
 * plain file delivery URL, never a playlist.
 */
function cloudinaryMp4Url(parsed) {
  const segments = cloudinaryVideoSegments(parsed);
  if (!segments) return null;

  const prefix = segments.slice(0, 2); // [cloud, "video"]
  let rest = segments.slice(2);
  if (rest.length && DELIVERY_TYPES.has(rest[0])) {
    prefix.push(rest.shift());
  }
  if (!rest.length) return null;

  // Drop the delivery extension from the final segment (playlist manifest or
  // source format); the extension we append becomes the requested format.
  const last = rest.pop();
  const dot = last.lastIndexOf(".");
  rest.push(dot > 0 ? last.slice(0, dot) : last);

  // Keep everything from the version boundary onward (version + folders +
  // public id). Without a version, strip leading transformation components.
  let versionIndex = -1;
  for (let i = 0; i < rest.length; i += 1) {
    if (VERSION_RE.test(rest[i])) versionIndex = i;
  }
  if (versionIndex >= 0) {
    rest = rest.slice(versionIndex);
  } else {
    while (rest.length > 1 && COMPONENT_RE.test(rest[0])) {
      rest.shift();
    }
  }

  if (!rest.length) return null;
  return parsed.origin + "/" + prefix.concat(rest).join("/") + ".mp4" + parsed.search;
}


/**
 * Normalize a stored media URL into a downloadable single-file URL, or null
 * when the URL genuinely has no downloadable representation.
 */
function normalizeDownloadUrl(raw) {
  const parsed = parseHttpUrl(raw);
  if (!parsed) return null;

  const ext = extensionOfSegment(lastSegment(parsed.pathname));
  if (!ext) {
    // No extension: assume a direct file endpoint (cannot prove otherwise
    // without fetching; playlists in practice always carry an extension).
    return parsed.href;
  }

  if (ext === "m3u8" || ext === "mpd") {
    // Streaming manifest: only a provider that can deliver the stored asset
    // as an MP4 file can produce a downloadable representation.
    return isCloudinaryVideo(parsed) ? cloudinaryMp4Url(parsed) : null;
  }

  if (IMAGE_EXTS.has(ext)) return null;

  if (AUDIO_EXTS.has(ext)) {
    // Audio assets are already single downloadable files.
    return parsed.href;
  }

  if (isCloudinaryVideo(parsed)) {
    // Original MP4 delivery is already valid/downloadable: reuse as-is.
    if (ext === "mp4") return parsed.href;
    // Otherwise ask the provider for the MP4 delivery of the stored video.
    return replaceFinalExtension(parsed, "mp4");
  }

  // Any other host: direct file URL (video file, unknown container, or
  // extensionless endpoint) is downloadable as-is.
  return parsed.href;
}

/**
 * Compute the downloadable representation for a media-like record.
 * Prefers the video file, falls back to audio-only media.
 */
function buildDownloadUrl(media) {
  if (!media) return null;
  const candidates = [media.videoUrl, media.audioUrl];
  for (let i = 0; i < candidates.length; i += 1) {
    const candidate = candidates[i];
    if (typeof candidate !== "string" || !candidate.trim()) continue;
    const normalized = normalizeDownloadUrl(candidate);
    if (normalized) return normalized;
  }
  return null;
}

module.exports = {
  normalizeDownloadUrl,
  buildDownloadUrl,
};

