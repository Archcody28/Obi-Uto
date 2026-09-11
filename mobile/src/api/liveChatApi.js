import client
  from "./client";

export const getMessages =
  async (streamId) => {
    const res =
      await client.get(
        `/live-chat/${streamId}`
      );

    return res.data;
  };