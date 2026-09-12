import {
  io,
} from "socket.io-client";
import { useAuthStore } from "../store/authStore";
import { SOCKET_URL } from "../config";

let socket = null;
let socketToken = null;

export const getSocket = () => {
  const token =
    useAuthStore.getState().token;

  if (
    socket &&
    socketToken === token
  ) {
    if (
      token &&
      !socket.connected
    ) {
      socket.connect();
    }

    return socket;
  }

  if (socket) {
    socket.disconnect();
  }

  socketToken = token;
  socket = io(SOCKET_URL, {
    transports: ["websocket"],
    autoConnect: !!token,
    auth: {
      token,
    },
  });

  return socket;
};

const socketProxy = {
  emit: (...args) =>
    getSocket().emit(...args),
  on: (...args) =>
    getSocket().on(...args),
  off: (...args) =>
    getSocket().off(...args),
  connect: () =>
    getSocket().connect(),
  disconnect: () =>
    getSocket().disconnect(),
};

export default socketProxy;
