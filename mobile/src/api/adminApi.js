import { api } from "./client";

export const createMedia =
  async (media) => {
    const response =
      await api.post(
        "/admin/upload",
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
        `/admin/media/${id}`
      );

    return response.data;
  };

// ---- Phase 25: admin dashboard / moderation ----
export const getAdminStats = async () => {
  const response = await api.get("/admin/stats");
  return response.data;
};

export const getAdminMedia = async (params) => {
  const response = await api.get("/admin/media", { params });
  return response.data;
};

export const hideMedia = async (id) => {
  const response = await api.post(`/admin/media/${id}/hide`);
  return response.data;
};

export const restoreMedia = async (id) => {
  const response = await api.post(`/admin/media/${id}/restore`);
  return response.data;
};

export const getAdminReports = async (params) => {
  const response = await api.get("/admin/reports", { params });
  return response.data;
};

export const getAdminReport = async (id) => {
  const response = await api.get(`/admin/reports/${id}`);
  return response.data;
};

export const updateAdminReport = async (id, body) => {
  const response = await api.patch(`/admin/reports/${id}`, body);
  return response.data;
};

export const warnAdminUser = async (id, message) => {
  const response = await api.post(`/admin/users/${id}/warn`, { message });
  return response.data;
};

export const suspendAdminUser = async (id, reason) => {
  const response = await api.post(`/admin/users/${id}/suspend`, { reason });
  return response.data;
};

export const unsuspendAdminUser = async (id) => {
  const response = await api.post(`/admin/users/${id}/unsuspend`);
  return response.data;
};

export const submitReport = async (body) => {
  const response = await api.post("/reports", body);
  return response.data;
};
