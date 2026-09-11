const User =
  require("../models/User");

const Media =
  require("../models/Media");

exports.getKPI =
  async (req, res) => {
    const users =
      await User.countDocuments();

    const media =
      await Media.countDocuments();

    res.json({
      totalUsers:
        users,

      totalMedia:
        media,
    });
  };