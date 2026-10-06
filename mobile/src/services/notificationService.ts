import * as Device from "expo-device";

import Constants from "expo-constants";

// Guard: expo-notifications push functionality is not available in Expo Go
// (removed in SDK 53+). Only set the handler in a development build.
const isExpoGo = !Constants.appOwnership || Constants.appOwnership === "expo";

// Lazy-load `expo-notifications` so its native side-effects / auto-registration
// (DevicePushTokenAutoRegistration.fx.js) are never eagerly evaluated at app
// start. In Expo Go this module is unsupported and its import graph can throw
// during eager route loading (which is fatal under the Expo Router + SDK 56
// runtime). Importing it on demand keeps the module away from the bootstrap path
// on all runtimes, while still loading it for dev/prod builds when actually used.
async function loadNotifications() {
  const Notifications = await import("expo-notifications");
  return Notifications;
}

if (!isExpoGo) {
  // Set the handler outside of any function only for buildable/dev-client
  // builds. Wrapped in a fire-and-forget call so the module is not eagerly
  // required at module-eval time (which would break Expo Go).
  void (async () => {
    try {
      const Notifications = await loadNotifications();
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
    } catch (err) {
      console.error("Failed to set notification handler:", err);
    }
  })();
}

export async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.log(
      "Push notifications require a physical device."
    );

    return null;
  }

  // Push notifications not supported in Expo Go (SDK 53+)
  if (isExpoGo) {
    return null;
  }

  const Notifications = await loadNotifications();

  const {
    status: existingStatus,
  } =
    await Notifications.getPermissionsAsync();

  let finalStatus =
    existingStatus;

  if (
    existingStatus !==
    "granted"
  ) {
    const {
      status,
    } =
      await Notifications.requestPermissionsAsync();

    finalStatus =
      status;
  }

  if (
    finalStatus !==
    "granted"
  ) {
    console.log(
      "Permission denied."
    );

    return null;
  }

  const token =
    await Notifications.getExpoPushTokenAsync({
      projectId:
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId,
    });

  return token.data;
}