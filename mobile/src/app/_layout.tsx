import {
  useEffect,
} from "react";

import {
  Stack,
  useRouter,
} from "expo-router";

import * as Notifications from "expo-notifications";

import {
  Platform,
} from "react-native";

import {
  registerForPushNotifications,
} from "../services/notificationService";

import {
  registerPushToken,
} from "../api/notificationApi";
import {
  useAuthStore,
} from "../store/authStore";

import {
  startSyncEngine,
} from "../services/syncService";

export default function RootLayout() {
  const user =
  useAuthStore(
    (state) => state.user
  );
  const restoreAuth =
  useAuthStore(
    (state) => state.restoreAuth
  );
  const router =
  useRouter();

  // Restore auth state on app startup
  useEffect(() => {
    restoreAuth();
  }, []);

  useEffect(() => {
  async function init() {
    try {
      if (!user?._id) {
        return;
      }

      const token =
        await registerForPushNotifications();

      if (!token) {
        return;
      }

      await registerPushToken(
        user._id,
        token,
        Platform.OS
      );
    } catch (err) {
      console.error(
  "Push notification registration failed:",
  err
);
    }
  }

  init();
}, [user?._id]);

useEffect(() => {
  const subscription =
    Notifications.addNotificationResponseReceivedListener(
      (response) => {
const data =
  response.notification.request.content.data as {
    type?: string;
    streamId?: string;
    mediaId?: string;
    userId?: string;
  };

if (!data?.type) {
  return;
}
        switch (data.type) {
          case "live":
            router.push({
              pathname: "/live" as any,
              params: {
                streamId:
                  data.streamId,
              },
            });
            break;

          case "upload":
            router.push({
              pathname: "/player",
              params: {
                mediaId:
                  data.mediaId,
              },
            });
            break;

          case "donation":
            router.push(
              "/wallet" as any
            );
            break;

          case "subscription":
            router.push(
              "/subscription" as any
            );
            break;

          case "follow":
            router.push({
              pathname:
                "/profile" as any,
              params: {
                userId:
                  data.userId,
              },
            });
            break;

          default:
            break;
        }
      }
    );

  return () =>
    subscription.remove();
}, []);
useEffect(() => {
  startSyncEngine();
}, []);
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
