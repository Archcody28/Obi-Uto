const adminMiddleware = (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({
        message: "Admin access required",
      });
    }

    next();
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
    });
  }
};

module.exports = adminMiddleware;