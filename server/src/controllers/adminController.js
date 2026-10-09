const Media = require("../models/Media");
const User = require("../models/User");
const Report = require("../models/Report");
const mongoose = require("mongoose");

function sanitizeReportedUser(u) {
  if (!u) return null;
  return {
    _id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    isSuspended: !!u.isSuspended,
    createdAt: u.createdAt,
  };
}

// UPLOAD MEDIA (ADMIN ONLY) — kept for legacy admin UI
exports.uploadMedia = async (req, res) => {
  try {
    const media = await Media.create(req.body);
    return res.status(201).json({
      message: "Media uploaded successfully",
      media,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Upload failed",
    });
  }
};

// DELETE MEDIA (ADMIN ONLY) — legacy; prefer hide/restore below
exports.deleteMedia = async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);
    if (!media) return res.status(404).json({ message: "Media not found" });
    await Media.findByIdAndDelete(req.params.id);
    return res.json({
      message: "Media deleted",
    });
  } catch (err) {
    return res.status(500).json({
      message: "Delete failed",
    });
  }
};

// GET /api/admin/reports?status=&page=&limit=
exports.listReports = async (req, res) => {
  try {
    const status = String(req.query.status || "").trim();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const filter = {};
    if (["open", "reviewing", "resolved", "dismissed"].includes(status)) filter.status = status;
    const [items, total] = await Promise.all([
      Report.find(filter)
        .populate("reporter", "name email role")
        .populate("resolvedBy", "name email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Report.countDocuments(filter),
    ]);
    return res.json({
      success: true,
      reports: items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to load reports" });
  }
};

// GET /api/admin/reports/:id
exports.getReport = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ success: false, message: "Invalid report id" });
    const report = await Report.findById(req.params.id)
      .populate("reporter", "name email role")
      .populate("resolvedBy", "name email")
      .lean();
    if (!report) return res.status(404).json({ success: false, message: "Report not found" });
    let target = null;
    try {
      if (report.targetType === "media") {
        target = await Media.findById(report.targetId)
          .select("title type status isHidden thumbnail createdAt")
          .lean();
      } else if (report.targetType === "user") {
        const u = await User.findById(report.targetId)
          .select("name email role isSuspended createdAt")
          .lean();
        target = sanitizeReportedUser(u);
      }
    } catch (_e) { target = null; }
    return res.json({ success: true, report, target });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to load report" });
  }
};

// PATCH /api/admin/reports/:id  { status, actionTaken }
exports.updateReport = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ success: false, message: "Invalid report id" });
    const body = req.body || {};
    const allowed = ["open", "reviewing", "resolved", "dismissed"];
    if (body.status && !allowed.includes(body.status))
      return res.status(400).json({ success: false, message: "Invalid status" });
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: "Report not found" });
    if (body.status) report.status = body.status;
    if (typeof body.actionTaken === "string") report.actionTaken = body.actionTaken.slice(0, 200);
    if (report.status === "resolved" || report.status === "dismissed") {
      report.resolvedBy = req.user.id;
      report.resolvedAt = new Date();
    }
    await report.save();
    return res.json({ success: true, message: "Report updated", report });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to update report" });
  }
};
// GET /api/admin/stats — real counts via efficient countDocuments
exports.getStats = async (req, res) => {
  try {
    const Creator = require("../models/Creator");
    const LiveStream = require("../models/LiveStream");
    const r = await Promise.all([
      User.countDocuments(),
      Creator.countDocuments(),
      Media.countDocuments(),
      Media.countDocuments({ status: "published", isHidden: { $ne: true } }),
      Media.countDocuments({ isHidden: true }),
      Report.countDocuments({ status: "open" }),
      Report.countDocuments({ status: "reviewing" }),
      Report.countDocuments({ status: "resolved" }),
      Report.countDocuments({ status: "dismissed" }),
      LiveStream.countDocuments({ isLive: true }),
    ]);
    const total = r[5] + r[6] + r[7] + r[8];
    return res.json({
      success: true,
      stats: {
        totalUsers: r[0], totalCreators: r[1], totalMedia: r[2],
        publishedMedia: r[3], hiddenMedia: r[4], liveNow: r[9],
        reports: { open: r[5], reviewing: r[6], resolved: r[7], dismissed: r[8], total },
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to load admin stats" });
  }
};

// POST /api/admin/media/:id/hide — reversible (preferred over delete)
exports.hideMedia = async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);
    if (!media) return res.status(404).json({ success: false, message: "Media not found" });
    media.isHidden = true;
    media.hiddenBy = req.user.id;
    media.hiddenAt = new Date();
    await media.save();
    return res.json({ success: true, message: "Media hidden", media: { _id: media._id, isHidden: true } });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to hide media" });
  }
};

// POST /api/admin/media/:id/restore
exports.restoreMedia = async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);
    if (!media) return res.status(404).json({ success: false, message: "Media not found" });
// POST /api/admin/users/:id/warn { message }
exports.warnUser = async (req, res) => {
  try {
    const Notification = require("../models/Notification");
    const user = await User.findById(req.params.id).select("_id name");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    const body = req.body || {};
    const message = String(body.message || "A moderator issued a warning about your account activity.").slice(0, 500);
    await Notification.create({
      userId: user._id,
      title: "Moderation warning",
      message,
      type: "system",
      data: { warnedBy: String(req.user.id), at: new Date().toISOString() },
    });
    return res.json({ success: true, message: "Warning sent to user" });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to warn user" });
  }
};

// POST /api/admin/users/:id/suspend { reason }
exports.suspendUser = async (req, res) => {
  try {
    if (String(req.params.id) === String(req.user.id))
      return res.status(400).json({ success: false, message: "You cannot suspend your own admin account" });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.role === "admin")
      return res.status(400).json({ success: false, message: "Cannot suspend another admin" });
    const body = req.body || {};
    user.isSuspended = true;
    user.suspensionReason = String(body.reason || "").slice(0, 300);
    user.suspendedAt = new Date();
    user.suspendedBy = req.user.id;
    await user.save();
    return res.json({ success: true, message: "User suspended", user: sanitizeReportedUser(user.toObject()) });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to suspend user" });
  }
};

// POST /api/admin/users/:id/unsuspend
exports.unsuspendUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    user.isSuspended = false;
    user.suspensionReason = "";
    user.suspendedAt = null;
    user.suspendedBy = null;
    await user.save();
    return res.json({ success: true, message: "User unsuspended", user: sanitizeReportedUser(user.toObject()) });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to unsuspend user" });
  }
};

// GET /api/admin/media?hidden=&page=&limit=
exports.listMedia = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const filter = {};
    if (req.query.hidden === "true") filter.isHidden = true;
    else if (req.query.hidden === "false") filter.isHidden = { $ne: true };
    const [items, total] = await Promise.all([
      Media.find(filter).select("title type status isHidden thumbnail views createdAt").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Media.countDocuments(filter),
    ]);
    return res.json({ success: true, media: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to load media" });
  }
};
    media.isHidden = false;
    media.hiddenBy = null;
    media.hiddenAt = null;
    await media.save();
    return res.json({ success: true, message: "Media restored", media: { _id: media._id, isHidden: false } });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to restore media" });
  }
};
