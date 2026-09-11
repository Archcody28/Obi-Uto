import {
  io,
} from "socket.io-client";
import { useAuthStore } from "../store/authStore";
import { SOCKET_URL } from "../config";

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