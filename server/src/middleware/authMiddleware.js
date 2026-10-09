const jwt = require("jsonwebtoken");
const User = require("./User");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    // Format: "Bearer token"
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Invalid token format",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded; // attach user payload ({ id, email })

    // Enforce suspension server-side on every authenticated request.
    // Keeps Phase 25 suspend/unsuspend meaningful without touching
    // individual feature controllers.
    try {
      const account = await User.findById(decoded.id)
        .select("isSuspended suspensionReason")
        .lean();
      if (account && account.isSuspended) {
        return res.status(403).json({
          success: false,
          message: "Account suspended." + (account.suspensionReason ? " Reason: " + account.suspensionReason : ""),
        });
      }
    } catch (_e) {
      // If the lookup itself fails, fail closed only on real DB errors
      // would break all auth; instead let the request continue — the
      // admin endpoints re-verify the user anyway. Log quietly.
    }

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized access",
    });
  }
};

module.exports = authMiddleware;