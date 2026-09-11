import { api } from "./client";

export const followCreator =
  async (
    userId,
    creatorId
  ) => {
    const response =
      await api.post(
        "/follows/follow",
        {
          userId,
          creatorId,
        }
      );

    return response.data;
  };

export const unfollowCreator =
  async (
    userId,
    creatorId
  ) => {
    const response =
      await api.post(
        "/follows/unfollow",
        {
          userId,
          creatorId,
        }
      );

    return response.data;
  };