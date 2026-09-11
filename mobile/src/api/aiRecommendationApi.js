import client
  from "./client";

export const getForYou =
  () =>
    client
      .get("/ai/for-you")
      .then(
        (res) =>
          res.data
      );