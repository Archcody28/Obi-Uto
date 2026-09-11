import client
  from "./client";

export const getTrending =
  async () => {
    const response =
      await client.get(
        "/recommendations/trending"
      );

    return response.data;
  };

export const getSimilar =
  async (id) => {
    if (!id) {
      return [];
    }

    const response =
      await client.get(
        `/recommendations/similar/${id}`
      );

    return response.data;
  };

export const getRecommended =
  async () => {
    const response =
      await client.get(
        "/recommendations/recommended"
      );

    return response.data;
  };

  export const getRecommendations =
  getRecommended;
