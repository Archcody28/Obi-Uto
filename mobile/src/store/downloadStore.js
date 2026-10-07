import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY =
  "offline-downloads";

// Lifecycle: idle -> downloading -> completed | failed | cancelled.
// Only completed items persist across restarts; in-progress items are
// re-marked as failed on load so they never falsely appear completed.

const sanitizeLoaded = (list) =>
  (Array.isArray(list) ? list : [])
    .filter((item) => item && item.id)
    .map((item) =>
      item.status === "completed"
        ? item
        : { ...item, status: "failed", progress: 0 }
    );

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

          if (saved) {
            const parsed = JSON.parse(saved);
            const cleaned = sanitizeLoaded(parsed);

            set({
              downloads: cleaned,
            });

            // Rewrite storage so stale in-progress entries never persist.
            await AsyncStorage.setItem(
              STORAGE_KEY,
              JSON.stringify(cleaned)
            );
          }
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
          videoUrl: download.videoUrl || null,
          uri: download.uri || null,
          status: download.status || "downloading",
          progress:
            typeof download.progress === "number"
              ? download.progress
              : 0,
          error: download.error || null,
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

        // Only completed downloads persist; active/failed entries stay
        // in memory so restarts never show false completions.
        const persistable = updated.filter(
          (item) => item.status === "completed"
        );

        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(
            persistable
          )
        );
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

        const persistable = updated.filter(
          (item) => item.status === "completed"
        );

        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(
            persistable
          )
        );
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
