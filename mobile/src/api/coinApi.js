import client from "./client";

export const getCoinBalance =
  () =>
    client
      .get("/coins/balance")
      .then(
        (res) =>
          res.data
      );