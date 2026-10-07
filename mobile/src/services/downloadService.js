import * as FileSystem from "expo-file-system/legacy";

export const downloadVideo = async (
  url,
  fileName,
  onProgress
) => {
  if (!url) {
    throw new Error("Download URL missing");
  }

  const directory = FileSystem.documentDirectory;

  if (!directory) {
    throw new Error("Storage unavailable on this device");
  }

  const safeName = String(fileName || `video-${Date.now()}.mp4`).replace(
    /[^a-zA-Z0-9._-]/g,
    "_"
  );
  const destination = directory + safeName;

  const downloadResumable =
    FileSystem.createDownloadResumable(
      url,
      destination,
      {},
      ({ totalBytesWritten,
         totalBytesExpectedToWrite }) => {

        const progress =
          totalBytesWritten /
          totalBytesExpectedToWrite;

        onProgress(progress);
      }
    );

  const result =
    await downloadResumable.downloadAsync();

  return result;
};