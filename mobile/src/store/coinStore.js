import { create }
  from "zustand";

export const useCoinStore =
  create((set) => ({
    coins: 0,

    setCoins:
      (coins) =>
        set({
          coins,
        }),

    deductCoins:
      (amount) =>
        set((state) => ({
          coins:
            Math.max(
              0,
              state.coins -
                amount
            ),
        })),
  }));