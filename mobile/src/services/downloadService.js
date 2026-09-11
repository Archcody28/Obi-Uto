import * as FileSystem from "expo-file-system";

export const downloadVideo = async (
  url,
  fileName,
  onProgress
) => {
  const destination =
    FileSystem.documentDirectory +
    fileName;

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