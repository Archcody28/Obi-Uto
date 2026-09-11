import client
  from "./client";

export const getLiveStreams =
  async () => {
    const response =
      await client.get(
        "/live"
      );

    return response.data;
  };

export const getUpcomingStreams =
  async () => {
    const response =
      await client.get(
        "/live/upcoming"
      );

    return response.data;
  };

export const scheduleStream =
  async (data) => {
    const response =
      await client.post(
        "/live/schedule",
        data
      );

    return response.data;
  };

export const startStream =
  async (id) => {
    const response =
      await client.patch(
        `/live/${id}/start`
      );

    return response.data;
  };

export const endStream =
  async (id) => {
    const response =
      await client.patch(
        `/live/${id}/end`
      );

    return response.data;
  };