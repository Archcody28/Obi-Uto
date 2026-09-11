import axios from "axios";
import { useAuthStore } from "../store/authStore";
import { API_BASE_URL } from "../config";

export const api =
  axios.create({
    baseURL: API_BASE_URL,
  });

// Attach token from authStore to every request
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;