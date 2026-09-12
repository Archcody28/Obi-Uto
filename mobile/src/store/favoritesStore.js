import { create } from "zustand";

export const useFavoritesStore =
  create((set) => ({
    favorites: [],

    addFavorite: (media) =>
      set((state) => {
        const mediaId =
          media.id || media._id;

        const exists =
          state.favorites.find(
            (item) =>
              (item.id ||
                item._id) ===
              mediaId
          );

        if (exists)
          return state;

        return {
          favorites: [
            ...state.favorites,
            media,
          ],
        };
      }),

    removeFavorite: (id) =>
      set((state) => ({
        favorites:
          state.favorites.filter(
            (item) =>
              (item.id ||
                item._id) !== id
          ),
      })),

    clearFavorites: () =>
      set({
        favorites: [],
      }),
  }));
