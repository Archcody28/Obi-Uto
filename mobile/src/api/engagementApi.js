import client
  from "./client";

export const toggleLike =
  async (mediaId) => {
    const response =
      await client.post(
        "/engagement/like",
        {
          mediaId,
        }
      );

    return response.data;
  };

export const addComment =
  async (
    mediaId,
    text,
    parentComment
  ) => {
    const response =
      await client.post(
        "/engagement/comment",
        {
          mediaId,
          text,
          parentComment,
        }
      );

    return response.data;
  };

export const getComments =
  async (mediaId) => {
    const response =
      await client.get(
        `/engagement/comments/${mediaId}`
      );

    return response.data;
  };