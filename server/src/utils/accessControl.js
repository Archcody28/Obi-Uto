const User = require("../models/User");
const Subscription = require("../models/Subscription");

exports.getUserFeatures = async (userId) => {
  const user = await User.findById(userId).populate("subscriptions");

  let features = [];

  user.subscriptions.forEach((sub) => {
    if (sub.status === "active") {
      features = features.concat(sub.features);
    }
  });

  return [...new Set(features)];
};