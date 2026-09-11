import axios from "axios";
import { useAuthStore } from "../store/authStore";

const API_URL =
  "http://192.168.42.43:5000/api";

export const api =
  axios.create({
    baseURL: API_URL,
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