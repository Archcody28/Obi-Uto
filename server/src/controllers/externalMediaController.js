const externalMediaService = require("../services/externalMediaService");

function clampLimit(raw, fallback, max) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, 1), max);
}

// GET /api/media/external — categorized external catalog (never throws).
async function getExternalHome(req, res) {
  try {
    const limit = clampLimit(req.query.limit, 8, 20);
    const data = await externalMediaService.getExternalHome(limit);
    return res.json({ source: "external", provider: data.provider, ...data });
  } catch (err) {
    return res.json({
      source: "external",
      provider: externalMediaService.PROVIDER,
      movies: [], series: [], music: [], podcasts: [],
      unavailable: true,
    });
  }
}

// GET /api/media/external/:id — single external item (ia:<identifier>).
async function getExternalById(req, res) {
  try {
    const identifier = externalMediaService.identifierFromId(req.params.id);
    if (!identifier) return res.status(404).json({ message: "External title not found" });
    const item = await externalMediaService.getExternalItem(identifier);
    if (!item) return res.status(404).json({ message: "External title not found" });
    return res.json({ source: "external", ...item });
  } catch (err) {
    return res.status(502).json({ message: "External provider unavailable" });
  }
}

module.exports = { getExternalHome, getExternalById };
