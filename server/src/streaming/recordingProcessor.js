"use strict";
/*
 * Phase 29 — resilient live-recording finalization.
 *
 * After a broadcast ends we try to archive the recorded MP4. Every failure
 * mode is guarded so stream cleanup can NEVER be blocked by a missing file,
 * a Cloudinary outage or a Media collection write error.
 */
const fs = require("fs");
const path = require("path");

/*
 * NodeMediaServer writes recordings into <mediaroot>/live. Depending on the
 * version/flags the file is either exactly "<streamKey>.mp4" or carries a
 * timestamp suffix ("<streamKey>_<epoch>.mp4").
 * Phase 30.5: the NMS v4 record server (when config.record.path is set)
 * writes "<record.path>/<streamPath>/<epoch>.flv" instead — probe that
 * layout too so an enabled recorder is discoverable. Pick the newest match.
 */
function findRecording(mediaRoot, streamKey, { recordPath = process.env.NMS_RECORD_PATH || "" } = {}) {
  if (!mediaRoot || !streamKey) return null;

  const candidates = [];
  const mp4Dir = path.join(mediaRoot, "live");

  let entries = [];
  try {
    entries = fs.readdirSync(mp4Dir);
  } catch (_err) {
    entries = [];
  }

  for (const file of entries.filter((f) => f.startsWith(streamKey) && f.endsWith(".mp4"))) {
    candidates.push(path.join(mp4Dir, file));
  }

  // NMS v4 FLV layout: <record.path>/live/<streamKey>/<epoch>.flv
  if (recordPath) {
    const flvDir = path.join(recordPath, "live", streamKey);
    let flvEntries = [];
    try {
      flvEntries = fs.readdirSync(flvDir);
    } catch (_err) {
      flvEntries = [];
    }
    for (const file of flvEntries.filter((f) => f.endsWith(".flv"))) {
      candidates.push(path.join(flvDir, file));
    }
  }

  if (!candidates.length) return null;

  candidates.sort();
  return candidates[candidates.length - 1];
}

async function finalizeRecording({
  streamKey,
  stream,
  mediaRoot,
  uploadRecordedVideo,
  Media,
  logger = console,
}) {
  const localFile = findRecording(mediaRoot, streamKey);
  if (!localFile) {
    logger.log(`[live] no recording file found for stream "${streamKey}"; skipping archive`);
    return { archived: false, reason: "no-recording-file" };
  }

  let uploaded = null;
  try {
    uploaded = await uploadRecordedVideo(localFile);
  } catch (err) {
    logger.error(`[live] recording upload failed for "${streamKey}": ${err && err.message}`);
  }

  if (!uploaded || !uploaded.secure_url) {
    logger.warn(`[live] recording for "${streamKey}" was not archived; keeping stream cleanup unaffected`);
    return { archived: false, reason: "upload-failed" };
  }

  try {
    await Media.create({
      title: (stream && stream.title) || `Live recording ${streamKey}`,
      description: (stream && stream.description) || "",
      thumbnail: (stream && stream.thumbnail) || "",
      category: (stream && stream.category) || "General",
      creator: stream && stream.creatorId,
      type: "video",
      source: uploaded.secure_url,
    });
  } catch (err) {
    logger.error(`[live] failed to register recording in Media for "${streamKey}": ${err && err.message}`);
    return { archived: false, reason: "media-create-failed", url: uploaded.secure_url };
  }

  return { archived: true, url: uploaded.secure_url };
}

module.exports = {
  findRecording,
  finalizeRecording,
};
