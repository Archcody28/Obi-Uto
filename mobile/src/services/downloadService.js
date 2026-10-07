import * as FileSystem from "expo-file-system/legacy";

// Registry of live DownloadResumable tasks so the UI can cancel them.
// expo-file-system legacy DownloadResumable supports downloadAsync +
// pauseAsync/resumeAsync, but pause/resume across restarts is unreliable,
// so this phase exposes Cancel + Retry (no fake pause/resume).
const activeTasks = new Map();

const isHlsUrl = (url) =>
  /\.m3u8(\?|$)/i.test(String(url || ""));

export const isOfflineCompatible = (url) =>
  !!url && !isHlsUrl(url);

export const downloadVideo = async (
  url,
  fileName,
  onProgress,
  taskKey
) => {
  if (!url) {
    throw new Error("Download URL missing");
  }

  if (isHlsUrl(url)) {
    throw new Error(
      "This title uses a live-streaming format that cannot be saved for offline playback."
    );
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

  const key = taskKey || destination;

  // Prevent duplicate concurrent tasks for the same file.
  if (activeTasks.has(key)) {
    throw new Error("Download already in progress");
  }

  const downloadResumable =
    FileSystem.createDownloadResumable(
      url,
      destination,
      {},
      ({ totalBytesWritten,
         totalBytesExpectedToWrite }) => {
        if (
          typeof onProgress === "function" &&
          totalBytesExpectedToWrite > 0
        ) {
          onProgress(
            totalBytesWritten /
              totalBytesExpectedToWrite
          );
        }
      }
    );

  activeTasks.set(key, downloadResumable);

  try {
    const result =
      await downloadResumable.downloadAsync();

    if (!result) {
      throw new Error("Download was cancelled");
    }

    return result;
  } finally {
    activeTasks.delete(key);
  }
};

export const cancelDownload = async (taskKey) => {
  const task = activeTasks.get(taskKey);

  if (!task) {
    return false;
  }

  try {
    // DownloadResumable has no cancelAsync; pausing halts the transfer
    // and downloadAsync resolves undefined, which we treat as cancelled.
    await task.pauseAsync();
  } catch (err) {
    console.log("Cancel download error:", err);
  } finally {
    activeTasks.delete(taskKey);
  }

  return true;
};

export const hasActiveDownload = (taskKey) =>
  activeTasks.has(taskKey);