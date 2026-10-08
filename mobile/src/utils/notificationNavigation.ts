import { Alert } from "react-native";

import { router } from "expo-router";

export type NotificationTarget = {
  type?: string;
  streamId?: string;
  mediaId?: string;
  creatorId?: string;
};

/**
 * Shared navigation for notification deep-link targets.
 *
 * Used by BOTH the expo-notifications response listener in app/_layout.tsx and
 * the in-app Notifications screen, so tapping a stored notification and tapping
 * a push notification always resolve to the same destination rules.
 *
 * Invalid/missing targets fail gracefully (Alert) instead of crashing or
 * navigating to an unknown route.
 */
export function openNotificationTarget(target: NotificationTarget | null | undefined) {
  if (!target?.type) {
    return;
  }

  switch (target.type) {
    case "live":
      if (target.streamId) {
        router.push({
          pathname: "/player" as any,
          params: {
            mediaId: target.streamId,
            streamId: target.streamId,
            isLive: "true",
          },
        });
      } else {
        router.push("/live" as any);
      }
      break;

    case "upload":
      if (!target.mediaId) {
        Alert.alert(
          "Upload",
          "This notification is missing a title destination."
        );
        break;
      }

      router.push({
        pathname: "/details" as any,
        params: {
          id: target.mediaId,
        },
      });
      break;

    case "donation":
      router.push("/wallet" as any);
      break;

    case "subscription":
      router.push("/subscription" as any);
      break;

    case "payment":
      router.push("/wallet" as any);
      break;

    case "download":
      router.push("/(tabs)/downloads" as any);
      break;

    case "follow":
      if (target.creatorId) {
        router.push({
          pathname: "/creator-profile" as any,
          params: {
            creatorId: target.creatorId,
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
    case "like":
      if (!target.mediaId) {
        Alert.alert(
          "Comment",
          "This notification is missing a title destination."
        );
        break;
      }

      router.push({
        pathname: "/details" as any,
        params: {
          id: target.mediaId,
        },
      });
      break;

    case "system":
    default:
      break;
  }
}