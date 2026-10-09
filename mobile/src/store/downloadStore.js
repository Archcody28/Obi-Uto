import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { verifyLocalFile } from "../services/localMediaFile";

const STORAGE_KEY =
  "offline-downloads";

// Lifecycle: idle -> downloading -> completed | failed | cancelled.
// Only completed items persist across restarts; in-progress items are
// re-marked as failed on load so they never falsely appear completed.
// Completed items are additionally verified against the filesystem: a
// "completed" row whose local file is gone or empty is recovered to a
// failed state with an honest error instead of a false offline promise.

const sanitizeItem = async (item) => {
  if (!item || !item.id) {
    return null;
  }

  if (item.status === "completed") {
    const check = await verifyLocalFile(item.uri);

    if (check.exists) {
      return item;
    }

    return {
      ...item,
      status: "failed",
      uri: null,
      progress: 0,
      error: "Downloaded file is no longer on this device.",
    };
  }

  // Never rehydrate an in-progress transfer as if it were real state.
  if (item.status === "downloading") {
    return {
      ...item,
      status: "failed",
      progress: 0,
      error:
        item.error || "Download was interrupted before it finished.",
    };
  }

  if (item.status === "cancelled") {
    return { ...item, progress: 0, error: null };
  }

  return { ...item, progress: 0 };
};

const sanitizeLoaded = async (list) => {
  const items = Array.isArray(list) ? list : [];
  const cleaned = await Promise.all(items.map(sanitizeItem));
  return cleaned.filter(Boolean);
};

// Rows persist across restarts (including failed/unavailable rows so the
// Downloads screen can keep distinguishing states and allow retry), but
// `sanitizeLoaded` downgrades anything that was mid-flight to failed — a
// failed or incomplete transfer is never rehydrated as completed.
const persistList = async (downloads) => {
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(downloads)
  );
};


export const useDownloadStore =
  create((set, get) => ({
    downloads: [],

    loadDownloads:
      async () => {
        try {
          const saved =
            await AsyncStorage.getItem(
              STORAGE_KEY
            );

          const cleaned = await sanitizeLoaded(
            saved ? JSON.parse(saved) : []
          );

          // Keep rows for transfers that are running right now so a reload
          // never wipes an active download from the UI.
          const active = get().downloads.filter(
            (item) => item.status === "downloading"
          );

          const merged = [
            ...cleaned.map((item) => {
              const running = active.find(
                (entry) => entry.id === item.id
              );
              return running || item;
            }),
            ...active.filter(
              (entry) =>
                !cleaned.some((item) => item.id === entry.id)
            ),
          ];

          set({
            downloads: merged,
          });

          // Rewrite storage so stale in-progress entries never persist.
          await persistList(merged);
        } catch (err) {
          console.log(
            "Load downloads error:",
            err
          );
        }
      },

    addDownload:
      async (download) => {
        // Refresh existing entry into downloading state instead of
        // duplicating; completed entries stay completed.
        const current = get().downloads.find(
          (item) =>
            item.id ===
            download.id
        );

        if (current?.status === "completed") {
          return;
        }

        const entry = {
          id: download.id,
          mediaId: download.mediaId || download.id,
          title: download.title || "Untitled",
          thumbnail:
            download.thumbnail || null,
          banner: download.banner || null,
          downloadUrl: download.downloadUrl || null,
          videoUrl: download.videoUrl || null,
          uri: download.uri || null,
          status: download.status || "downloading",
          progress:
            typeof download.progress === "number"
              ? download.progress
              : 0,
          error: download.error || null,
          // false when the title genuinely has no downloadable file
          // (streaming-only media) so the UI can show "unavailable".
          downloadable: download.downloadable !== false,
          updatedAt: Date.now(),
        };

        const updated = current
          ? get().downloads.map((item) =>
              item.id === download.id ? entry : item
            )
          : [...get().downloads, entry];

        set({
          downloads:
            updated,
        });

        // Persist every row (failed/unavailable rows must stay visible and
        // retryable after a restart); `sanitizeLoaded` downgrades anything
        // that was mid-flight so restarts never show false completions.
        await persistList(updated);
      },

    updateDownload:
      async (
        id,
        patch
      ) => {
        const progress =
          typeof patch === "number" ? patch : patch?.progress;
        const next = typeof patch === "number" ? {} : patch || {};

        const updated =
          get().downloads.map(
            (item) =>
              item.id === id
                ? {
                    ...item,
                    ...next,
                    ...(progress !== undefined
                      ? { progress }
                      : null),
                    updatedAt: Date.now(),
                  }
                : item
          );

        set({
          downloads:
            updated,
        });

        // Progress-only ticks skip disk writes (they fire many times per
        // second during a transfer); any status/content change persists.
        const keys = Object.keys(next);
        const progressOnly =
          typeof patch === "number" ||
          (keys.length > 0 &&
            keys.every(
              (key) => key === "progress" || key === "updatedAt"
            ));

        if (!progressOnly) {
          await persistList(updated);
        }
      },

    removeDownload:
  async (id) => {
    const item =
      get().downloads.find(
        (download) =>
          download.id === id
      );

    if (!item) {
      return;
    }

    const updated =
      get().downloads.filter(
        (download) =>
          download.id !== id
      );

    set({
      downloads:
        updated,
    });

    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        updated
      )
    );

    return item;
  },

  clearDownloads:
    async () => {
      set({
        downloads: [],
      });

      await AsyncStorage.removeItem(
        STORAGE_KEY
      );
    },
  }));
