const Media = require("../models/Media");
const Creator = require("../models/Creator");
const TYPES = ["movie", "series", "music", "song", "podcast"];
function bad(res, code, message) { return res.status(code).json({ message: message }); }
async function needCreator(req, res) {
  const c = await Creator.findOne({ userId: req.user.id });
  if (!c) { bad(res, 403, "Creator account required"); return null; }
  return c;
}
exports.createContent = async function (req, res) {
  try {
    const creator = await needCreator(req, res);
    if (!creator) return;
    const title = String(req.body.title || "").trim().slice(0, 200);
    const description = String(req.body.description || "").trim().slice(0, 5000);
    const raw = String(req.body.type || "movie").trim().toLowerCase();
    const type = TYPES.indexOf(raw) >= 0 ? raw : "movie";
    let genre = req.body.genre;
    if (typeof genre === "string") genre = genre.split(",");
    if (!Array.isArray(genre)) genre = [];
    genre = genre.map(function (g) { return String(g).trim().slice(0, 40); }).filter(Boolean).slice(0, 5);
    const thumbnail = String(req.body.thumbnail || "").trim();
    const banner = String(req.body.banner || "").trim();
    const videoUrl = String(req.body.videoUrl || "").trim();
    const audioUrl = String(req.body.audioUrl || "").trim();
    if (!title) return bad(res, 400, "Title is required.");
    if (!videoUrl && !audioUrl) return bad(res, 400, "Upload a video (or audio) file before publishing.");
    const main = videoUrl || audioUrl;
    if (main.indexOf("http://") !== 0 && main.indexOf("https://") !== 0) {
      return bad(res, 400, "Media URL is malformed. Re-upload the file.");
    }
    if (thumbnail && thumbnail.indexOf("http://") !== 0 && thumbnail.indexOf("https://") !== 0) {
      return bad(res, 400, "Thumbnail URL is malformed. Re-upload the thumbnail.");
    }
    const media = await Media.create({
      title: title, description: description, type: type, genre: genre,
      thumbnail: thumbnail || undefined, banner: banner || undefined,
      videoUrl: videoUrl || undefined, audioUrl: audioUrl || undefined,
      creatorId: creator._id, uploadedBy: req.user.id, status: "published"
    });
    return res.status(201).json(media);
  } catch (err) {
    if (err && err.name === "ValidationError") return bad(res, 400, "Invalid content data.");
    return res.status(500).json({ message: "Failed to publish content. Please retry." });
  }
};
exports.myUploads = async function (req, res) {
  try {
    const creator = await needCreator(req, res);
    if (!creator) return;
    const rows = await Media.find({ creatorId: creator._id }).sort({ createdAt: -1 });
    return res.json(rows);
  } catch (err) { return res.status(500).json({ message: "Failed to load uploads." }); }
};
exports.deleteMyContent = async function (req, res) {
  try {
    const creator = await needCreator(req, res);
    if (!creator) return;
    const m = await Media.findOne({ _id: req.params.id, creatorId: creator._id });
    if (!m) return bad(res, 404, "Content not found");
    await m.deleteOne();
    return res.json({ message: "Content deleted successfully" });
  } catch (err) { return res.status(500).json({ message: "Failed to delete content." }); }
};
