import { create } from "zustand";

export const useSearchStore =
  create((set) => ({
    history: [],

    addHistory: (term) =>
      set((state) => ({
        history: [
          term,
          ...state.history.filter(
            (item) => item !== term
          ),
        ].slice(0, 10),
      })),
  }));