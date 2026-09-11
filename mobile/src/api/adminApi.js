import { api } from "./client";

export const createMedia =
  async (media) => {
    const response =
      await api.post(
        "/media",
        media
      );

    return response.data;
  };
  export const getAllMedia =
  async () => {
    const response =
      await api.get("/media");

    return response.data;
  };

export const deleteMedia =
  async (id) => {
    const response =
      await api.delete(
        `/media/${id}`
      );

    return response.data;
  };