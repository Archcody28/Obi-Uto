import {
  useCallback,
  useEffect,
  useRef,
} from "react";

import {
  Stack,
  useRouter,
  useSegments,
} from "expo-router";

import * as Notifications from "expo-notifications";

import {
  Platform,
  Alert,
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
  useCoinWalletStore,
} from "../store/coinWalletStore";
import {
  useDownloadStore,
} from "../store/downloadStore";
import {
  useFavoritesStore,
} from "../store/favoritesStore";
import {
  usePlayerStore,
} from "../store/playerStore";
import {
  useProfileStore,
} from "../store/profileStore";
import {
  useSyncStore,
} from "../store/syncStore";
import {
  useWatchStore,
} from "../store/watchStore";

import {
  startSyncEngine,
} from "../services/syncService";

export default function RootLayout() {
  const user =
  useAuthStore(
    (state) => state.user
  );
  const token =
  useAuthStore(
    (state) => state.token
  );
  const isRestoring =
  useAuthStore(
    (state) => state.isRestoring
  );
  const restoreAuth =
  useAuthStore(
    (state) => state.restoreAuth
  );
  const router =
  useRouter();
  const segments =
  useSegments();
  const clearedUnauthedState =
    useRef(false);

  const clearAuthenticatedStores =
    useCallback(() => {
    useFavoritesStore
      .getState()
      .clearFavorites();
    useWatchStore
      .getState()
      .clearWatching();
    usePlayerStore
      .getState()
      .resetPlayer();
    useCoinWalletStore
      .getState()
      .clearWallet();
    useSyncStore
      .getState()
      .clearQueue();
    useDownloadStore
      .getState()
      .clearDownloads()
      .catch(console.error);
    useProfileStore
      .getState()
      .clearProfiles()
      .catch(console.error);
  }, []);

  // Restore auth state on app startup
  useEffect(() => {
    restoreAuth();
  }, [restoreAuth]);

  useEffect(() => {
    if (isRestoring) {
      return;
    }

    const firstSegment =
      segments[0];
    const isIndex =
      !firstSegment;

    if (!token) {
      if (!clearedUnauthedState.current) {
        clearAuthenticatedStores();
        clearedUnauthedState.current =
          true;
      }

      if (!isIndex) {
      router.replace("/");
      }
      return;
    }

    clearedUnauthedState.current =
      false;

    if (token && isIndex) {
      router.replace("/(tabs)/home" as any);
    }
  }, [
    token,
    isRestoring,
    segments,
    router,
    clearAuthenticatedStores,
  ]);

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
    creatorId?: string;
  };

if (!data?.type) {
  return;
}
        switch (data.type) {
          case "live":
            if (data.streamId) {
              router.push({
                pathname: "/player" as any,
                params: {
                  mediaId:
                    data.streamId,
                  streamId:
                    data.streamId,
                  isLive: "true",
                },
              });
            } else {
              router.push("/live" as any);
            }
            break;

          case "upload":
            if (!data.mediaId) {
              Alert.alert(
                "Upload",
                "This notification is missing a title destination."
              );
              break;
            }

            router.push({
              pathname: "/details" as any,
              params: {
                id: data.mediaId,
              },
            });
            break;

          case "donation":
            router.push(
              "/wallet" as any
            );
            break;

          case "subscription":
            Alert.alert(
              "Subscription",
              "Subscription management is not available in this app yet."
            );
            break;

          case "payment":
            router.push(
              "/wallet" as any
            );
            break;

          case "download":
            router.push(
              "/(tabs)/downloads" as any
            );
            break;

          case "follow":
            if (data.creatorId) {
              router.push({
                pathname:
                  "/creator-profile" as any,
                params: {
                  creatorId:
                    data.creatorId,
                },
              });
            } else {
              Alert.alert(
                "Follow",
                "This notification is missing a creator destination."
              );
            }
            break;

          case "comment":
            if (!data.mediaId) {
              Alert.alert(
                "Comment",
                "This notification is missing a title destination."
              );
              break;
            }

            router.push({
              pathname: "/details" as any,
              params: {
                id: data.mediaId,
              },
            });
            break;

          case "system":
          default:
            break;
        }
      }
    );

  return () =>
    subscription.remove();
}, [router]);
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
