const mongoose = require("mongoose");
const Report = require("../models/Report");
const Media = require("../models/Media");
const User = require("../models/User");
const Creator = require("../models/Creator");
const LiveStream = require("../models/LiveStream");

// POST /api/reports — authenticated users file a report.
// Validates the target exists so reports always identify it reliably.
exports.createReport = async (req, res) => {
  try {
    const body = req.body || {};
    const targetType = String(body.targetType || "").trim();
    const targetId = String(body.targetId || "").trim();
    const reason = String(body.reason || "").trim().slice(0, 120);
    const details = String(body.details || "").trim().slice(0, 2000);

    if (!["media", "user", "creator", "live"].includes(targetType))
      return res.status(400).json({ success: false, message: "Invalid targetType" });
    if (!mongoose.Types.ObjectId.isValid(targetId))
      return res.status(400).json({ success: false, message: "Invalid targetId" });
    if (!reason)
      return res.status(400).json({ success: false, message: "Reason is required" });

    let exists = null;
    if (targetType === "media") exists = await Media.findById(targetId).select("_id").lean();
    else if (targetType === "user") exists = await User.findById(targetId).select("_id").lean();
    else if (targetType === "creator") exists = await Creator.findById(targetId).select("_id").lean();
    else if (targetType === "live") exists = await LiveStream.findById(targetId).select("_id").lean();
    if (!exists) return res.status(404).json({ success: false, message: "Reported target not found" });

    const report = await Report.create({
      reporter: req.user.id,
      targetType,
      targetId,
      reason,
      details,
    });

    return res.status(201).json({ success: true, message: "Report submitted", report });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to submit report" });
  }
};
