const { getUserFeatures } = require("../utils/accessControl");

const featureGuard = (requiredFeature) => {
  return async (req, res, next) => {
    const features = await getUserFeatures(req.user.id);

    if (!features.includes(requiredFeature)) {
      return res.status(403).json({
        message: "Upgrade subscription required",
      });
    }

    next();
  };
};

module.exports = featureGuard;