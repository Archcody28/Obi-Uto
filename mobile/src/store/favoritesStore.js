import { create } from "zustand";

export const useFavoritesStore =
  create((set) => ({
    favorites: [],

    addFavorite: (media) =>
      set((state) => {
        const exists =
          state.favorites.find(
            (item) =>
              item.id === media.id
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
              item.id !== id
          ),
      })),
  }));