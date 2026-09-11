const cloudinary =
  require(
    "../uploads/cloudinary"
  );

const streamifier =
  require("streamifier");

const uploadToCloudinary =
  (
    fileBuffer,
    folder =
      "media-platform"
  ) => {
    return new Promise(
      (
        resolve,
        reject
      ) => {
        const stream =
          cloudinary.uploader.upload_stream(
            {
              folder,
              resource_type:
                "auto",
            },
            (
              error,
              result
            ) => {
              if (error)
                return reject(
                  error
                );

              resolve(
                result
              );
            }
          );

        streamifier
          .createReadStream(
            fileBuffer
          )
          .pipe(stream);
      }
    );
  };

module.exports =
  uploadToCloudinary;