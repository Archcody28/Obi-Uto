import client from "./client";

/*
 Save progress
*/

export const saveProgress =
  async ({
    mediaId,
    currentTime,
    duration,
  }) => {
    const response =
      await client.post(
        "/watch/progress",
        {
          mediaId,
          currentTime,
          duration,
        }
      );

    return response.data;
  };

/*
 Get single progress
*/

export const getProgress =
  async (mediaId) => {
    const response =
      await client.get(
        `/watch/progress/${mediaId}`
      );

    return response.data;
  };

/*
 Continue Watching
*/

export const continueWatching =
  async () => {
    const response =
      await client.get(
        "/watch/continue"
      );

    return response.data;
  };

/*
 Download authorization
*/

export const authorizeDownload =
  async (mediaId) => {
    const response =
      await client.get(
        `/watch/download/${mediaId}`
      );

    return response.data;
  };