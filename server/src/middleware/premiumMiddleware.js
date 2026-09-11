const User = require("../models/User");

const premiumMiddleware =
  async (req, res, next) => {
    try {
      const user =
        await User.findById(
          req.user.id
        );

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      if (
        user.subscription !==
        "premium"
      ) {
        return res.status(403).json({
          message:
            "Premium subscription required",
        });
      }

      next();
    } catch (err) {
      return res.status(500).json({
        message:
          "Premium verification failed",
      });
    }
  };

module.exports =
  premiumMiddleware;