// Environment configuration for Obi-Uto mobile app
// In production, these should come from environment variables or app config

const isDev = process.env.NODE_ENV !== "production";

// API base URL - uses environment variable or falls back to development default
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (isDev
    ? "http://192.168.42.43:5000/api"
    : "https://api.obi-uto.com/api");

// Socket.IO URL - uses environment variable or falls back to development default
export const SOCKET_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL ||
  (isDev
    ? "http://192.168.42.43:5000"
    : "https://api.obi-uto.com");