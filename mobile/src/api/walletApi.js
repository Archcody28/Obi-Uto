import { api } from "./client";

export const getWallet =
  async (
    creatorId
  ) => {
    const response =
      await api.get(
        `/wallet/${creatorId}`
      );

    return response.data;
  };

export const requestWithdrawal =
  async (
    creatorId,
    amount
  ) => {
    const response =
      await api.post(
        "/wallet/withdraw",
        {
          creatorId,
          amount,
        }
      );

    return response.data;
  };