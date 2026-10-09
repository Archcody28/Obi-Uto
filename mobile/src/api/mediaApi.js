import client
  from "./client";

// PHASE 26 — external media helpers. External items carry
// `source: "external"` and stable "ia:<identifier>" ids; creator items
// carry no `source` field. Never treat external as creator.
export const isExternalMedia = (item) =>
  item?.source === "external" ||
  (typeof item?._id === "string" && item._id.indexOf("ia:") === 0) ||
  (typeof item?.id === "string" && item.id.indexOf("ia:") === 0);

export const fetchExternalHome = async (limit = 8) => {
  const res = await client.get("/media/external", { params: { limit } });
  return res.data;
};

export const fetchExternalById = async (id) => {
  const res = await client.get(`/media/external/${encodeURIComponent(id)}`);
  const data = res.data || {};
  return data.source === "external" ? data : { source: "external", ...data };
};

export const fetchMedia = async () => {
  const res =
    await client.get(
      "/media"
    );

  return res.data;
};

export const fetchMediaById = async (id) => {
  const res =
    await client.get(
      `/media/${id}`
    );

  return res.data;
};

export const getMediaDetails =
  async (id) => {
    const response =
      await client.get(
        `/media/${id}`
      );

    return response.data;
  };

  export const getEpisodes =
  async (
    seriesId
  ) => {
    const response =
      await client.get(
        `/media/series/${seriesId}/episodes`
      );

    return response.data;
  };
