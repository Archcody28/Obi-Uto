import client from "./client";

export const registerPushToken =
  (
    userId: string,
    token: string,
    platform: string
  ) =>
    client.post(
      "/notifications/register-token",
      {
        userId,
        token,
        platform,
      }
    );

export const getNotifications =
  (userId: string) =>
    client.get(
      `/notifications/${userId}`
    );

export const markRead =
  (id: string) =>
    client.put(
      `/notifications/read/${id}`
    );

export const markAllRead =
  (userId: string) =>
    client.put(
      `/notifications/read-all/${userId}`
    );

export const deleteNotification =
  (id: string) =>
    client.delete(
      `/notifications/${id}`
    );

export const notifyMe =
  (
    streamId: string,
    userId: string
  ) =>
    client.post(
      "/notifications/notify-me",
      {
        streamId,
        userId,
      }
    );
