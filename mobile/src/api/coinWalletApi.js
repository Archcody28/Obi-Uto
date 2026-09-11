import client
  from "./client";

export const getWallet =
  () =>
    client
      .get(
        "/coin-wallet"
      )
      .then(
        (res) =>
          res.data
      );

export const getCoinHistory =
  () =>
    client
      .get(
        "/coin-wallet/history"
      )
      .then(
        (res) =>
          res.data
      );