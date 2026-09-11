import {
  api,
} from "./client";

export const getCreatorContent =
  async (creatorId) => {
    const response =
      await api.get(
        `/creators/${creatorId}/content`
      );

    return response.data;
  };
