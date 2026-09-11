import client
  from "./client";

export const getLiveStreams =
  async () => {
    const res =
      await client.get(
        "/live-streams/live"
      );

    return res.data;
  };

export const createStream =
  async (data) => {
    const res =
      await client.post(
        "/live-streams",
        data
      );

    return res.data;
  };

export const getDiscovery =
  async () => {
    const res =
      await client.get(
        "/live-streams/discover"
      );

    return res;
  };
