const uploadToCloudinary = require("../utils/uploadToCloudinary");
exports.uploadFile = async function (req, res) {
  try {
    if (!req.user) return res.status(401).json({ error: "Authentication required." });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const mime = String(req.file.mimetype || "").toLowerCase();
    const allowed = ["video/", "image/", "audio/"];
    const ok = allowed.some(function (p) { return mime.indexOf(p) === 0; });
    if (!ok) return res.status(415).json({ error: "Unsupported file type." });
    if (!req.file.buffer || req.file.buffer.length === 0) {
      return res.status(400).json({ error: "Uploaded file is empty or malformed." });
    }
    const kind = mime.indexOf("video/") === 0 ? "videos" : (mime.indexOf("audio/") === 0 ? "audio" : "thumbnails");
    let result = null;
    try {
      result = await uploadToCloudinary(req.file.buffer, "media-platform/" + kind);
    } catch (e) {
      return res.status(502).json({ error: "Upload storage failed. Please retry." });
    }
    if (!result || !result.secure_url) return res.status(502).json({ error: "Upload storage failed. Please retry." });
    return res.json({ url: result.secure_url, publicId: result.public_id, resourceType: result.resource_type || null });
  } catch (err) {
    if (err && err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "File exceeds the 500MB server limit." });
    return res.status(500).json({ error: (err && err.message) || "Upload failed." });
  }
};
