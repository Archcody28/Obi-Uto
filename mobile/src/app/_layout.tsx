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

import Constants from "expo-constants";

import {
  Platform,
} from "react-native";

import {
  registerForPushNotifications,
} from "../services/notificationService";

import {
  openNotificationTarget,
} from "../utils/notificationNavigation";

// expo-notifications is unsupported in Expo Go (SDK 53+) and its module graph
// can throw during eager route loading. Import it on demand only for
// development builds where push notifications are available.
const isExpoGo = !Constants.appOwnership || Constants.appOwnership === "expo";

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

  // Load (and filesystem-verify) offline downloads once at startup so the
  // player and Downloads screen see honest state immediately.
  useEffect(() => {
    useDownloadStore
      .getState()
      .loadDownloads()
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (isRestoring) {
      return;
    }

    const firstSegment =
      segments[0];
    const isIndex =
      !firstSegment;

    const isAuthRoute =
      firstSegment === "register";

    if (!token && !isAuthRoute) {
      if (!isIndex) {
        if (!clearedUnauthedState.current) {
          clearAuthenticatedStores();
          clearedUnauthedState.current =
            true;
        }
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
  if (isExpoGo) {
    // expo-notifications push handling is unavailable in Expo Go.
    return;
  }

  let subscription: { remove: () => void } | undefined;

  void (async () => {
    try {
      const Notifications = await import("expo-notifications");
      subscription =
        Notifications.addNotificationResponseReceivedListener(
          (response) => {
            const data =
              response.notification.request.content.data as {
                type?: string;
                streamId?: string;
                mediaId?: string;
                creatorId?: string;
              };

            openNotificationTarget(data);
          }
    );
    } catch (err) {
      console.error(
        "Failed to register notification response listener:",
        err
      );
    }
  })();

  return () =>
    subscription?.remove();
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
