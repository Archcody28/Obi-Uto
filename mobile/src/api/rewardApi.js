import client
  from "./client";

export const claimDailyReward =
  () =>
    client
      .post(
        "/rewards/daily"
      )
      .then(
        (res) =>
          res.data
      );

export const getRewards =
  () =>
    client
      .get("/rewards")
      .then(
        (res) =>
          res.data
      );