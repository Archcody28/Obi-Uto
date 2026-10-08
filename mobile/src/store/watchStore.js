import { create } from "zustand";

export const useWatchStore = create((set) => ({
  watching: [],

  saveProgress: (media) =>
    set((state) => {
      if (!media?.id) return state;
      // Completed (>=95%) titles leave the row instead of going stale.
      if (media.duration > 0 && media.progress >= media.duration * 0.95) {
        return {
          watching: state.watching.filter((item) => item.id !== media.id),
        };
      }
      const filtered = state.watching.filter((item) => item.id !== media.id);
      return { watching: [media, ...filtered].slice(0, 20) };
    }),

  removeFromWatching: (id) =>
    set((state) => ({
      watching: state.watching.filter((item) => item.id !== id),
    })),

  clearWatching: () => set({ watching: [] }),
}));
