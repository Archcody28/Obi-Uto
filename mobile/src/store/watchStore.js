import { create } from "zustand";

export const useWatchStore =
  create((set) => ({
    watching: [],

    saveProgress: (
      media
    ) =>
      set((state) => {
        const filtered =
          state.watching.filter(
            (item) =>
              item.id !== media.id
          );

        return {
          watching: [
            media,
            ...filtered,
          ],
        };
      }),

    clearWatching: () =>
      set({
        watching: [],
      }),
  }));
