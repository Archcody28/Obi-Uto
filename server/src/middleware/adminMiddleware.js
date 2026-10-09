const User = require("../models/User");

// Admin-only gate. NEVER trusts a client-provided role: the JWT issued
// by authController carries only { id, email }, so the role is always
// re-read from the database. Must run after authMiddleware (401 for
// unauthenticated), and returns 403 for non-admin users.
const adminMiddleware = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const user = await User.findById(req.user.id).select("role").lean();

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = adminMiddleware;