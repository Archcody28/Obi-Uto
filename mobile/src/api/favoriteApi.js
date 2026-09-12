import { api } from "./client";

export const addFavorite =
  async (mediaId) => {
    const response =
      await api.post(
        "/favorites",
        {
          mediaId,
        }
      );

    return response.data;
  };

export const getFavorites =
  async () => {
    const response =
      await api.get(
        "/favorites"
      );

    return response.data;
  };

export const removeFavorite =
  async (mediaId) => {
    const response =
      await api.delete(
        `/favorites/${mediaId}`
      );

    return response.data;
  };