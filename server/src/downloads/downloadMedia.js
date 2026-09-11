    import RNFS from "react-native-fs";

export const downloadMedia = async (url, path, onProgress) => {
  const task = RNFS.downloadFile({
    fromUrl: url,
    toFile: path,
    progress: data => {
      const progress = data.bytesWritten / data.contentLength;
      if (onProgress) onProgress(progress);
    }
  });

  await task.promise;
};
const Media =
  require("../models/Media");

const {
  creditCreator,
} = require(
  "../services/revenueService"
);

const media =
  await Media.findById(
    mediaId
  );

if (media?.creator) {
  await creditCreator(
    media.creator,
    0.10,
    "Download Revenue"
  );
}