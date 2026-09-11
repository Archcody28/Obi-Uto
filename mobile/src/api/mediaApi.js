import client
  from "./client";

export const fetchMedia = async () => {
  const res =
    await client.get(
      "/media"
    );

  return res.data;
};

export const fetchMediaById = async (id) => {
  const res =
    await client.get(
      `/media/${id}`
    );

  return res.data;
};

export const getMediaDetails =
  async (id) => {
    const response =
      await client.get(
        `/media/${id}`
      );

    return response.data;
  };

  export const getEpisodes =
  async (
    seriesId
  ) => {
    const response =
      await client.get(
        `/media/series/${seriesId}/episodes`
      );

    return response.data;
  };
