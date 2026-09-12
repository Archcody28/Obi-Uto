import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY =
  "offline-downloads";

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
            set({
              downloads:
                JSON.parse(saved),
            });
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
        const exists =
          get().downloads.find(
            (item) =>
              item.id ===
              download.id
          );

        if (exists) {
          return;
        }

        const updated = [
          ...get().downloads,
          download,
        ];

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
      },

    updateDownload:
      async (
        id,
        progress
      ) => {
        const updated =
          get().downloads.map(
            (item) =>
              item.id === id
                ? {
                    ...item,
                    progress,
                  }
                : item
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
