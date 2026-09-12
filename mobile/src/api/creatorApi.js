import { api }
  from "./client";

export const createContent =
  async (payload) => {
    const response =
      await api.post(
        "/creator/content",
        payload
      );

    return response.data;
  };

export const createCreator =
  async (payload) => {
    const response =
      await api.post(
        "/creators/register",
        {
          displayName:
            payload.creatorName ||
            payload.displayName,
          bio: payload.bio,
          avatarUrl:
            payload.avatarUrl,
          bannerUrl:
            payload.bannerUrl,
        }
      );

    return response.data;
  };

export const getMyUploads =
  async () => {
    const response =
      await api.get(
        "/creator/content"
      );

    return response.data;
  };

export const getMyCreatorProfile =
  async () => {
    const response =
      await api.get(
        "/creators/me"
      );

    return response.data;
  };

export const getCreatorContent =
  async (creatorId) => {
    const response =
      await api.get(
        `/creators/${creatorId}/content`
      );

    return response.data;
  };

export const deleteContent =
  async (id) => {
    const response =
      await api.delete(
        `/creator/content/${id}`
      );

    return response.data;
  };
