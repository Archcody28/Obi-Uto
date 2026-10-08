const express = require("express");
const router = express.Router();
const upload = require("../middleware/uploadMiddleware");
const auth = require("../middleware/authMiddleware");
const ctl = require("../controllers/uploadController");
function onErr(err, req, res, next) {
  if (err) {
    if (err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "File exceeds the 500MB server limit." });
    if (/unsupported file type/i.test(err.message || "")) return res.status(415).json({ error: err.message });
    return res.status(400).json({ error: err.message || "Upload rejected." });
  }
  return next();
}
router.post("/", auth, upload.single("file"), onErr, ctl.uploadFile);
module.exports = router;
