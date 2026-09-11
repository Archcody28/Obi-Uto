const Media = require("../models/Media");

// UPLOAD MEDIA (ADMIN ONLY)
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

// DELETE MEDIA
exports.deleteMedia = async (req, res) => {
  try {
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