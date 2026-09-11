import client
  from "./client";

export const getForYou =
  async () => {
    const res =
      await client.get(
        "/recommendations-v2/for-you"
      );

    return res.data;
  };

export const getSimilar =
  async (
    mediaId
  ) => {
    const res =
      await client.get(
        `/recommendations-v2/similar/${mediaId}`
      );

    return res.data;
  };