"use strict";
/* Phase 29 — guarded recording upload: missing files and provider
 * failures return null so stream cleanup is never blocked. */
const fs = require("fs");

const cloudinary = require("../uploads/cloudinary");

async function uploadRecordedVideo(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }

  let result = null;
  try {
    result = await cloudinary.uploader.upload(filePath, {
      resource_type: "video",
      folder: "recordings",
    });
  } catch (_err) {
    return null;
  }

  try {
    fs.unlinkSync(filePath);
  } catch (_err) {
    /* Local cleanup failure must not fail the upload result. */
  }

  return result;
}

module.exports = uploadRecordedVideo;