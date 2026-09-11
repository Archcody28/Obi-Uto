const fs =
  require("fs");

const cloudinary =
  require("../uploads/cloudinary");

async function uploadRecordedVideo(
  filePath
) {
  const result =
    await cloudinary.uploader.upload(
      filePath,
      {
        resource_type:
          "video",

        folder:
          "recordings",
      }
    );

  fs.unlinkSync(filePath);

  return result;
}

module.exports =
  uploadRecordedVideo;