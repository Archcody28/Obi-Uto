import { create }
  from "zustand";

import {
  getWallet,
  getCoinHistory,
} from "../api/coinWalletApi";

export const
  useCoinWalletStore =
    create(
      (set) => ({
        wallet: {
          coins: 0,
          totalPurchased: 0,
          totalSpent: 0,
        },

        history: [],

        loadWallet:
          async () => {
            const wallet =
              await getWallet();

            set({
              wallet,
            });
          },

        loadHistory:
          async () => {
            const history =
              await getCoinHistory();

            set({
              history,
            });
          },
      })
    );