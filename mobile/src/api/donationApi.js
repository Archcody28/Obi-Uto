import client
  from "./client";

export const sendDonation =
  (data) =>
    client
      .post(
        "/donations",
        data
      )
      .then(
        (res) =>
          res.data
      );

export const getLeaderboard =
  (streamId) =>
    client
      .get(
        `/donations/leaderboard/${streamId}`
      )
      .then(
        (res) =>
          res.data
      );