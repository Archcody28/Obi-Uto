const uploadToCloudinary =
  require(
    "../utils/uploadToCloudinary"
  );

exports.uploadFile =
  async (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({
            error:
              "No file uploaded",
          });
      }

      const result =
        await uploadToCloudinary(
          req.file.buffer
        );

      res.json({
        url:
          result.secure_url,
        publicId:
          result.public_id,
      });
    } catch (err) {
      res.status(500).json({
        error:
          err.message,
      });
    }
  };