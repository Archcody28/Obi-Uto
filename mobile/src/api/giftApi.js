import client from "./client";

export const getGifts =
  () =>
    client
      .get("/gifts")
      .then(
        (res) =>
          res.data
      );

export const sendGift =
  (data) =>
    client
      .post(
        "/gifts/send",
        data
      )
      .then(
        (res) =>
          res.data
      );