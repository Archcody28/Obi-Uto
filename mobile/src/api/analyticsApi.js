import client
  from "./client";

export const getCreatorAnalytics =
  async (
    creatorId
  ) => {
    const response =
      await client.get(
        `/analytics/creator/${creatorId}`
      );

    return response.data;
  };

 
export const getCreatorRevenue =
  async (
    creatorId
  ) => {
    const res =
      await client.get(
        `/creator-analytics/revenue/${creatorId}`
      );

    return res.data;
  };
