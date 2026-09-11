import { api } from "./client";

export const getHomeMedia =
  async () => {
    const response =
      await api.get(
        "/media/home"
      );

    return response.data;
  };