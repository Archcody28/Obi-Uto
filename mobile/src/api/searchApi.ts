import { api } from "./client";

export const searchMedia = async (
  query: string
) => {
  const response = await api.get(
    `/media/search?q=${query}`
  );

  return response.data;
};