import * as FileSystem from "expo-file-system/legacy";

import { authorizeDownload } from "../api/watchApi";

import { useDownloadStore } from "../store/downloadStore";

import {
  deleteLocalFile,
  extensionForUrl,
  isPlaylistUrl,
  verifyLocalFile,
} from "./localMediaFile";

// Registry of live DownloadResumable tasks so the UI can cancel them.
// expo-file-system legacy DownloadResumable supports downloadAsync +
// pauseAsync/resumeAsync, but pause/resume across restarts is unreliable,
// so this phase exposes Cancel + Retry (no fake pause/resume).
// key -> { task, destination }
const activeTasks = new Map();

// Cancellations requested before the transfer actually started (e.g. while
// the entitlement check is still in flight). Consumed by the next step that
// would otherwise begin work, so a cancel is never silently ignored.
const cancelIntents = new Set();

/**
 * Keep the existing HLS/manifest guard: only media that genuinely has no
 * downloadable representation (a streaming playlist URL, or no URL) is
 * blocked. Direct files — including provider MP4 delivery URLs derived from
 * `downloadUrl` — are downloadable.
 */
export const isOfflineCompatible = (url) =>
  !!url && !isPlaylistUrl(url);

/**
 * Resolve the URL to transfer for a media/download entry.
 * Prefers the explicit `downloadUrl` (single-file representation exposed by
 * the API contract) and falls back to a direct `videoUrl` file.
 * Returns null when the title genuinely has no downloadable file.
 */
export const resolveDownloadUrl = (entry) => {
  const primary = entry?.downloadUrl;
  const fallback = entry?.videoUrl;

  if (isOfflineCompatible(primary)) {
    return primary;
  }

  if (isOfflineCompatible(fallback)) {
    return fallback;
  }

  return null;
};

const cancelMessage = "Download cancelled";


export const downloadVideo = async (
  url,
  fileName,
  onProgress,
  taskKey
) => {
  if (!url) {
    throw new Error("Download URL missing");
  }

  if (isPlaylistUrl(url)) {
    throw new Error(
      "This title uses a streaming playlist format that has no downloadable file."
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

  // Consume a cancellation requested before the transfer started.
  if (cancelIntents.delete(key)) {
    throw new Error(cancelMessage);
  }

  const downloadResumable = FileSystem.createDownloadResumable(
    url,
    destination,
    {},
    ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
      if (
        typeof onProgress === "function" &&
        totalBytesExpectedToWrite > 0
      ) {
        const ratio = totalBytesWritten / totalBytesExpectedToWrite;
        onProgress(Math.min(Math.max(ratio, 0), 1));
      }
    }
  );

  activeTasks.set(key, { task: downloadResumable, destination });

  try {
    const result = await downloadResumable.downloadAsync();

    if (!result) {
      // pauseAsync/cancel resolves undefined — treat as cancelled and do
      // not leave a partial file behind.
      await deleteLocalFile(destination);
      throw new Error(cancelMessage);
    }

    // Never mark a failed transfer as completed: require a success status
    // and a real, non-empty local file before reporting completion.
    const status =
      typeof result.status === "number" ? result.status : 0;

    if (status && (status < 200 || status >= 300)) {
      await deleteLocalFile(destination);
      throw new Error(
        `Server responded with HTTP ${status}. The file was not saved.`
      );
    }

    const check = await verifyLocalFile(destination);

    if (!check.exists) {
      await deleteLocalFile(destination);
      throw new Error("Downloaded file is missing or empty.");
    }

    const headers = result.headers || {};
    const expected = Number(
      headers["content-length"] ?? headers["Content-Length"] ?? NaN
    );

    if (Number.isFinite(expected) && expected > 0 && check.size < expected) {
      await deleteLocalFile(destination);
      throw new Error("Download was incomplete and has been discarded.");
    }

    return {
      uri: result.uri || destination,
      status: status || 200,
      size: check.size,
    };
  } catch (err) {
    if (err && err.message === cancelMessage) {
      await deleteLocalFile(destination);
    }
    throw err;
  } finally {
    activeTasks.delete(key);
  }
};

export const cancelDownload = async (taskKey) => {
  const record = activeTasks.get(taskKey);

  if (!record) {
    // The transfer may not have started yet (e.g. entitlement check in
    // flight) — record the intent so that step honors it immediately.
    cancelIntents.add(taskKey);
    return true;
  }

  try {
    // DownloadResumable has no cancelAsync; pausing halts the transfer
    // and downloadAsync resolves undefined, which we treat as cancelled.
    await record.task.pauseAsync();
  } catch (err) {
    console.log("Cancel download error:", err);
  } finally {
    activeTasks.delete(taskKey);
    // Remove the partial file so nothing incomplete lingers on disk.
    await deleteLocalFile(record.destination);
    cancelIntents.delete(taskKey);
  }

  return true;
};

export const hasActiveDownload = (taskKey) =>
  activeTasks.has(taskKey);

/**
 * Orchestrate a full offline download for one media entry.
 *
 * Flow: duplicate protection -> honest unavailable state -> immediate
 * "downloading" state -> server entitlement check -> real byte transfer ->
 * validation -> completed (persisted) or failed/cancelled (honest error).
 *
 * Returns { status, message?, uri?, unavailable? } for the caller to alert.
 */
export const startDownload = async (entry) => {
  const store = useDownloadStore.getState();
  const key = entry?.mediaId || entry?.id;

  if (!key) {
    return { status: "failed", message: "Media ID missing" };
  }

  // Clear stale cancel intents from earlier sessions/rows.
  cancelIntents.delete(key);

  const existing = store.downloads.find((item) => item.id === key);

  // Duplicate protection: one task per media, completed rows are not
  // re-downloaded (unless their file disappeared — recovered below).
  if (existing?.status === "downloading" || hasActiveDownload(key)) {
    return {
      status: "skipped",
      message: "Download already in progress",
    };
  }

  if (existing?.status === "completed") {
    const check = await verifyLocalFile(existing.uri);

    if (check.exists) {
      return {
        status: "completed",
        uri: existing.uri,
        message: "Already available offline",
      };
    }

    // The local file vanished: recover honestly, then re-download.
    await store.updateDownload(key, {
      status: "failed",
      uri: null,
      progress: 0,
      error: "Downloaded file is no longer on this device.",
    });
  }

  const title = entry?.title || existing?.title || "Untitled";
  const thumbnail =
    entry?.thumbnail !== undefined
      ? entry?.thumbnail
      : existing?.thumbnail || null;
  const banner =
    entry?.banner !== undefined
      ? entry?.banner
      : existing?.banner || null;
  const downloadUrl =
    entry?.downloadUrl !== undefined
      ? entry?.downloadUrl
      : existing?.downloadUrl || null;
  const videoUrl =
    entry?.videoUrl !== undefined
      ? entry?.videoUrl
      : existing?.videoUrl || null;

  const resolved = resolveDownloadUrl({ downloadUrl, videoUrl });

  if (!resolved) {
    const sourceExists = !!(downloadUrl || videoUrl);
    const message = sourceExists
      ? "This title only has a streaming playlist and no downloadable file."
      : "No downloadable file exists for this title yet.";

    await store.addDownload({
      id: key,
      mediaId: key,
      title,
      thumbnail,
      banner,
      downloadUrl: downloadUrl || null,
      videoUrl: videoUrl || null,
      uri: null,
      status: "failed",
      progress: 0,
      error: message,
      downloadable: false,
    });

    return { status: "failed", unavailable: true, message };
  }

  // Immediate downloading state before any network/file work happens.
  await store.addDownload({
    id: key,
    mediaId: key,
    title,
    thumbnail,
    banner,
    downloadUrl: downloadUrl || null,
    videoUrl,
    uri: null,
    status: "downloading",
    progress: 0,
    error: null,
    downloadable: true,
  });

  // Server-side entitlement check (premium gating).
  try {
    const auth = await authorizeDownload(key);

    if (auth && auth.allowed === false) {
      const message = auth.message || "Download not allowed";
      await useDownloadStore.getState().updateDownload(key, {
        status: "failed",
        progress: 0,
        error: message,
      });
      return { status: "failed", message };
    }
  } catch (err) {
    const message =
      err?.response?.data?.message ||
      err?.message ||
      "Download authorization failed";
    await useDownloadStore.getState().updateDownload(key, {
      status: "failed",
      progress: 0,
      error: message,
    });
    return { status: "failed", message };
  }

  // Honor a cancel that arrived while authorization was in flight.
  if (cancelIntents.delete(key)) {
    await useDownloadStore.getState().updateDownload(key, {
      status: "cancelled",
      progress: 0,
      error: null,
    });
    return { status: "cancelled", message: "Download cancelled" };
  }

  try {
    const fileName = `${key}.${extensionForUrl(resolved)}`;

    const result = await downloadVideo(
      resolved,
      fileName,
      (progress) => {
        useDownloadStore.getState().updateDownload(key, {
          progress,
        });
      },
      key
    );

    await useDownloadStore.getState().updateDownload(key, {
      status: "completed",
      progress: 1,
      uri: result.uri,
      error: null,
    });

    return { status: "completed", uri: result.uri };
  } catch (err) {
    const message = err?.message || "Unable to download";

    // Cancellation surfaces as a cancelled state, not a failure.
    if (/cancel/i.test(message)) {
      await useDownloadStore.getState().updateDownload(key, {
        status: "cancelled",
        progress: 0,
        error: null,
      });
      return { status: "cancelled", message: "Download cancelled" };
    }

    await useDownloadStore.getState().updateDownload(key, {
      status: "failed",
      progress: 0,
      error: message,
    });

    return { status: "failed", message };
  }
};
