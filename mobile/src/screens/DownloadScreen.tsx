import React, {
  useEffect,
} from "react";

import {
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  router,
} from "expo-router";

import {
  useDownloadStore,
} from "../store/downloadStore";

import {
  cancelDownload,
  hasActiveDownload,
  startDownload,
} from "../services/downloadService";

import {
  verifyLocalFile,
} from "../services/localMediaFile";

import * as FileSystem
  from "expo-file-system/legacy";
import { AppTheme } from "../constants/theme";

// Canonical image: Media model + MediaCard/HeroBanner all use
// thumbnail first, banner as fallback. No new field invented.
const imageFor = (item) =>
  item?.thumbnail || item?.banner || null;

// States shown on a row:
// - completed        -> "Available offline" (file verified on load)
// - downloading      -> live byte progress
// - failed, retryable-> honest error (downloadable representation exists)
// - failed, unavail. -> "Unavailable offline" (streaming-only media)
// - cancelled        -> cancelled, retry offered
const statusLabel = (item) => {
  switch (item?.status) {
    case "downloading":
      return `Downloading ${Math.round((item?.progress || 0) * 100)}%`;
    case "completed":
      return "Available offline";
    case "failed":
      if (item?.downloadable === false) {
        return `Unavailable offline — ${item?.error || "no downloadable file"}`;
      }
      return item?.error || "Download failed";
    case "cancelled":
      return "Cancelled";
    default:
      return "Queued";
  }
};

export default function DownloadScreen() {
  const insets = useSafeAreaInsets();
  const downloads =
    useDownloadStore(
      (state) =>
        state.downloads
    );

  const removeDownload =
    useDownloadStore(
      (state) =>
        state.removeDownload
    );

  const updateDownload =
    useDownloadStore(
      (state) =>
        state.updateDownload
    );

  const loadDownloads =
    useDownloadStore(
      (state) =>
        state.loadDownloads
    );

  useEffect(() => {
    loadDownloads();
  }, []);

  const handleCancel =
    async (id) => {
      await cancelDownload(id);
      await updateDownload(id, {
        status: "cancelled",
        progress: 0,
        error: null,
      });
    };

  const handleRetry =
    async (item) => {
      if (!item || hasActiveDownload(item.id)) {
        return;
      }

      // Real retry: re-run the full flow using the stored representation
      // (no navigation required); progress/failure render on this row.
      await startDownload({
        id: item.id,
        mediaId: item.mediaId || item.id,
        title: item.title,
        thumbnail: item.thumbnail || null,
        banner: item.banner || null,
        downloadUrl: item.downloadUrl || null,
        videoUrl: item.videoUrl || null,
      });
    };

  const openItem =
    async (item) => {
      if (item?.status !== "completed" || !item?.uri) {
        return;
      }

      // Confirm the file really exists before promising offline playback.
      const check = await verifyLocalFile(item.uri);

      if (!check.exists) {
        await updateDownload(item.id, {
          status: "failed",
          uri: null,
          progress: 0,
          error: "Downloaded file is no longer on this device.",
        });

        Alert.alert(
          "File missing",
          "The downloaded file is no longer on this device. Tap Retry to save it again."
        );

        return;
      }

      router.push({
        pathname: "/player",
        params: {
          mediaId: item.mediaId || item.id,
          title: item.title,
          localUri: item.uri,
        },
      });
    };

  const handleDelete =
    (id) => {
      Alert.alert(
        "Remove Download",
        "Delete this download from your device?",
        [
          {
            text: "Cancel",
            style: "cancel",
          },

          {
            text: "Delete",
            style: "destructive",
            onPress:
              async () => {
                try {
                  const item =
                    await removeDownload(
                      id
                    );

                  if (item?.uri) {
                    const info =
                      await FileSystem.getInfoAsync(
                        item.uri
                      );

                    if (
                      info.exists
                    ) {
                      await FileSystem.deleteAsync(
                        item.uri
                      );
                    }
                  }

                  Alert.alert(
                    "Deleted",
                    "Download removed"
                  );
                } catch (
                  err
                ) {
                  console.log(
                    err
                  );

                  Alert.alert(
                    "Error",
                    "Failed to remove download"
                  );
                }
              },
          },
        ]
      );
    };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: AppTheme.spacing.lg + insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <Text style={styles.kicker}>
        Library
      </Text>
      <Text style={styles.title}>
        Downloads
      </Text>

      <FlatList
        data={downloads}
        keyExtractor={(item) =>
          item.id
        }
        contentContainerStyle={
          styles.list
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            Downloaded titles will appear here for offline playback.
          </Text>
        }
        renderItem={({ item }) => {
          const image = imageFor(item);
          const active =
            item?.status === "downloading" ||
            hasActiveDownload(item.id);

          return (
            <View style={styles.card}>
              {image ? (
                <Image
                  source={{ uri: image }}
                  style={styles.thumb}
                />
              ) : (
                <View
                  style={[
                    styles.thumb,
                    styles.thumbFallback,
                  ]}
                >
                  <Text style={styles.thumbText}>
                    OBI
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.cardCopy}
                activeOpacity={0.78}
                onPress={() =>
                  openItem(item)
                }
              >
                <Text
                  style={styles.mediaTitle}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>

                <Text
                  style={[
                    styles.uri,
                    item?.status === "failed" &&
                      styles.uriError,
                  ]}
                  numberOfLines={2}
                >
                  {statusLabel(item)}
                </Text>

                {item?.status === "downloading" && (
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.round((item?.progress || 0) * 100)}%`,
                        },
                      ]}
                    />
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.actions}>
                {active && (
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() =>
                      handleCancel(item.id)
                    }
                  >
                    <Text style={styles.deleteText}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                )}

                {(item?.status === "failed" ||
                  item?.status === "cancelled") &&
                  item?.downloadable !== false && (
                  <TouchableOpacity
                    style={styles.retryBtn}
                    onPress={() =>
                      handleRetry(item)
                    }
                  >
                    <Text style={styles.deleteText}>
                      Retry
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() =>
                    handleDelete(item.id)
                  }
                >
                  <Text style={styles.deleteText}>
                    Remove
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppTheme.colors.background,
    padding: AppTheme.spacing.lg,
  },

  kicker: {
    color: AppTheme.colors.accent,
    fontSize: AppTheme.typography.kicker.fontSize,
    fontWeight: AppTheme.typography.kicker.fontWeight,
    letterSpacing: AppTheme.typography.kicker.letterSpacing,
    textTransform: "uppercase",
    marginTop: AppTheme.spacing.md,
  },

  title: {
    color: AppTheme.colors.text,
    fontSize: 30,
    fontWeight: "900",
    marginTop: 4,
    marginBottom: AppTheme.spacing.xl,
  },

  list: {
    paddingBottom: 96,
  },

  empty: {
    color: AppTheme.colors.textMuted,
    textAlign: "center",
    marginTop: 44,
    lineHeight: 21,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: AppTheme.colors.surface,
    borderColor: AppTheme.colors.border,
    borderWidth: 1,
    padding: 12,
    borderRadius: AppTheme.radius.md,
    marginBottom: 12,
  },

  thumb: {
    width: 64,
    height: 88,
    borderRadius: AppTheme.radius.sm,
    backgroundColor: AppTheme.colors.surfaceSoft,
  },

  thumbFallback: {
    alignItems: "center",
    justifyContent: "center",
  },

  thumbText: {
    color: AppTheme.colors.textSubtle,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },

  cardCopy: {
    flex: 1,
    flexShrink: 1,
  },

  mediaTitle: {
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.subtitle.fontSize,
    fontWeight: "900",
    lineHeight: 21,
  },

  uri: {
    color: AppTheme.colors.textSubtle,
    marginTop: 5,
    fontSize: 12,
    lineHeight: 16,
  },

  uriError: {
    color: AppTheme.colors.danger,
  },

  progressTrack: {
    height: 6,
    marginTop: 8,
    borderRadius: 3,
    backgroundColor: "rgba(248,244,234,0.18)",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: AppTheme.colors.accent,
  },

  actions: {
    gap: 8,
    alignItems: "stretch",
    flexShrink: 0,
  },

  retryBtn: {
    minHeight: 40,
    justifyContent: "center",
    backgroundColor: AppTheme.colors.surfaceSoft,
    borderColor: AppTheme.colors.accent,
    borderWidth: 1,
    paddingHorizontal: 12,
    borderRadius: AppTheme.radius.sm,
  },

  cancelBtn: {
    minHeight: 40,
    justifyContent: "center",
    backgroundColor: AppTheme.colors.surfaceSoft,
    borderColor: AppTheme.colors.border,
    borderWidth: 1,
    paddingHorizontal: 12,
    borderRadius: AppTheme.radius.sm,
  },

  deleteBtn: {
    minHeight: 40,
    justifyContent: "center",
    backgroundColor: "rgba(225,91,100,0.16)",
    borderColor: AppTheme.colors.danger,
    borderWidth: 1,
    paddingHorizontal: 12,
    borderRadius: AppTheme.radius.sm,
  },

  deleteText: {
    color: AppTheme.colors.text,
    textAlign: "center",
    fontWeight: "900",
  },
});
