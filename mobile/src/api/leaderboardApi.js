import client
  from "./client";

export const getTopFans =
  () =>
    client
      .get(
        "/leaderboards/fans"
      )
      .then(
        (res) =>
          res.data
      );