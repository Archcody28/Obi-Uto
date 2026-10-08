const multer = require("multer");
const storage = multer.memoryStorage();
const PREFIX = ["video/", "image/", "audio/"];
function fileFilter(req, file, cb) {
  const m = String(file.mimetype || "").toLowerCase();
  const ok = PREFIX.some(function (p) { return m.indexOf(p) === 0; });
  if (!ok) return cb(new Error("Unsupported file type. Upload video, image, or audio."));
  cb(null, true);
}
const upload = multer({ storage: storage, fileFilter: fileFilter, limits: { fileSize: 500 * 1024 * 1024 } });
module.exports = upload;
