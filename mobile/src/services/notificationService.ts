import * as Device from "expo-device";

import * as Notifications from "expo-notifications";

import Constants from "expo-constants";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.log(
      "Push notifications require a physical device."
    );

    return null;
  }

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