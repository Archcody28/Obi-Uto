import { create }
  from "zustand";

import {
  claimDailyReward,
  getRewards,
} from "../api/rewardApi";

export const
  useRewardStore =
    create(
      (set) => ({
        reward: null,

        loadRewards:
          async () => {
            const reward =
              await getRewards();

            set({
              reward,
            });
          },

        claimReward:
          async () => {
            const result =
              await claimDailyReward();

            return result;
          },
      })
    );