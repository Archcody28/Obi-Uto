import {
  io,
} from "socket.io-client";
import { useAuthStore } from "../store/authStore";

const SOCKET_URL = "http://192.168.42.43:5000";

// Create socket instance with auth token
const createSocket = () => {
  const token = useAuthStore.getState().token;

  const socket = io(SOCKET_URL, {
    transports: ["websocket"],
    auth: {
      token: token,
    },
  });

  return socket;
};

// Lazy-initialize socket
let socket = null;

const getSocket = () => {
  if (!socket) {
    socket = createSocket();
  }
  return socket;
};

export default getSocket();