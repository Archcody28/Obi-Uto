import { api } from "./client";

export const followCreator =
  async (
    creatorId
  ) => {
    const response =
      await api.post(
        "/follows/follow",
        {
          creatorId,
        }
      );

    return response.data;
  };

export const unfollowCreator =
  async (
    creatorId
  ) => {
    const response =
      await api.post(
        "/follows/unfollow",
        {
          creatorId,
        }
      );

    return response.data;
  };
