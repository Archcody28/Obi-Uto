import React, {
  useEffect,
} from "react";

import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  router,
} from "expo-router";

import {
  useDownloadStore,
} from "../store/downloadStore";

import * as FileSystem
  from "expo-file-system";
import { AppTheme } from "../constants/theme";

export default function DownloadScreen() {
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

  const loadDownloads =
    useDownloadStore(
      (state) =>
        state.loadDownloads
    );

  useEffect(() => {
    loadDownloads();
  }, []);

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
    <View style={styles.container}>
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
        renderItem={({ item }) => (
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardCopy}
              activeOpacity={0.78}
              onPress={() =>
                router.push({
                  pathname: "/player",
                  params: {
                    mediaId: item.id,
                    title: item.title,
                    localUri: item.uri,
                  },
                })
              }
            >
              <Text
                style={styles.mediaTitle}
                numberOfLines={2}
              >
                {item.title}
              </Text>

              <Text style={styles.uri}>
                Available offline
              </Text>
            </TouchableOpacity>

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
        )}
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
    padding: 16,
    borderRadius: AppTheme.radius.md,
    marginBottom: 12,
  },

  cardCopy: {
    flex: 1,
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
