import client from "./client";

export const registerPushToken =
  (
    token: string,
    platform: string
  ) =>
    client.post(
      "/notifications/register-token",
      {
        token,
        platform,
      }
    );

export const getNotifications =
  () =>
    client.get(
      "/notifications"
    );

export const markRead =
  (id: string) =>
    client.put(
      `/notifications/read/${id}`
    );

export const markAllRead =
  () =>
    client.put(
      "/notifications/read-all"
    );

export const deleteNotification =
  (id: string) =>
    client.delete(
      `/notifications/${id}`
    );

export const notifyMe =
  (streamId: string) =>
    client.post(
      "/notifications/notify-me",
      {
        streamId,
      }
    );
