import * as FileSystem from "expo-file-system/legacy";

/**
 * Local file helpers shared by the download store and the download service.
 *
 * Lives in its own module so `downloadStore` and `downloadService` can both
 * use it without importing each other (no cycles).
 */

const VIDEO_EXTS = [
  "mp4", "m4v", "mov", "webm", "mkv", "avi", "flv", "wmv",
  "mpg", "mpeg", "3gp", "3g2", "ts", "m2ts", "ogv",
];

const AUDIO_EXTS = [
  "mp3", "m4a", "m4b", "aac", "wav", "ogg", "opus", "flac",
];

/** A URL that is a streaming manifest (playlist), not a downloadable file. */
export const isPlaylistUrl = (url) =>
  /\.(m3u8|mpd)(\?|#|$)/i.test(String(url || ""));

/**
 * File extension (without dot) to store a downloaded URL under.
 * Derived honestly from the URL; defaults to mp4 only when unknowable.
 */
export const extensionForUrl = (url) => {
  try {
    const clean = String(url || "").split(/[?#]/)[0];
    const segment = clean.split("/").pop() || "";
    const dot = segment.lastIndexOf(".");
    const ext = dot > 0 ? segment.slice(dot + 1).toLowerCase() : "";
    if (!ext) return "mp4";
    if (VIDEO_EXTS.includes(ext) || AUDIO_EXTS.includes(ext)) return ext;
    if (ext === "m3u8" || ext === "mpd") return "mp4";
    return ext;
  } catch (err) {
    return "mp4";
  }
};

/**
 * Verify a local file exists and holds bytes. A "completed" download whose
 * file is gone or empty is NOT available offline.
 */
export const verifyLocalFile = async (uri) => {
  if (!uri) {
    return { exists: false, size: 0 };
  }

  try {
    const info = await FileSystem.getInfoAsync(uri);

    if (!info || !info.exists) {
      return { exists: false, size: 0 };
    }

    const size = typeof info.size === "number" ? info.size : 0;
    return { exists: size > 0, size };
  } catch (err) {
    console.log("verifyLocalFile error:", err);
    return { exists: false, size: 0 };
  }
};

/** Delete a local file if present. Never throws. */
export const deleteLocalFile = async (uri) => {
  if (!uri) {
    return false;
  }

  try {
    const info = await FileSystem.getInfoAsync(uri);

    if (info && info.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }

    return true;
  } catch (err) {
    console.log("deleteLocalFile error:", err);
    return false;
  }
};
