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
 * timestamp suffix ("<streamKey>_<epoch>.mp4"). Pick the newest match.
 */
function findRecording(mediaRoot, streamKey) {
  if (!mediaRoot || !streamKey) return null;

  const dir = path.join(mediaRoot, "live");

  let entries = [];
  try {
    entries = fs.readdirSync(dir);
  } catch (_err) {
    return null;
  }

  const matches = entries
    .filter((file) => file.startsWith(streamKey) && file.endsWith(".mp4"))
    .sort();

  if (!matches.length) return null;

  return path.join(dir, matches[matches.length - 1]);
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
