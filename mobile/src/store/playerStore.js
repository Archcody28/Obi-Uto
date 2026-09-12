import { create } from "zustand";

export const usePlayerStore =
  create((set, get) => ({
    currentMedia: null,

    queue: [],

    currentIndex: 0,

    setCurrentMedia: (
      media
    ) =>
      set({
        currentMedia: media,
      }),

    setQueue: (
      queue,
      index = 0
    ) =>
      set({
        queue,
        currentIndex: index,
        currentMedia:
          queue[index] || null,
      }),

    playNext: () => {
      const {
        queue,
        currentIndex,
      } = get();

      const nextIndex =
        currentIndex + 1;

      if (
        nextIndex >=
        queue.length
      ) {
        return;
      }

      set({
        currentIndex:
          nextIndex,

        currentMedia:
          queue[nextIndex],
      });
    },

    playPrevious: () => {
      const {
        queue,
        currentIndex,
      } = get();

      const prevIndex =
        currentIndex - 1;

      if (
        prevIndex < 0
      ) {
        return;
      }

      set({
        currentIndex:
          prevIndex,

        currentMedia:
          queue[prevIndex],
      });
    },
    
    playMedia: (media) =>
  set({
    currentMedia: media,
  }),

    clearCurrentMedia:
      () =>
        set({
          currentMedia: null,
          queue: [],
          currentIndex: 0,
        }),

    resetPlayer:
      () =>
        set({
          currentMedia: null,
          queue: [],
          currentIndex: 0,
        }),
  }));
