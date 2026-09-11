import React, {
  useEffect,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from "react-native";

import {
  router,
} from "expo-router";

import {
  useDownloadStore,
} from "../store/downloadStore";

import * as FileSystem
  from "expo-file-system";

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

            style:
              "destructive",

            onPress:
              async () => {
                try {
                  const item =
                    await removeDownload(
                      id
                    );

                  if (
                    item?.uri
                  ) {
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
      <Text style={styles.title}>
        Downloads
      </Text>

      <FlatList
        data={downloads}
        keyExtractor={(item) =>
          item.id
        }
        ListEmptyComponent={
          <Text
            style={styles.empty}
          >
            No downloads yet
          </Text>
        }
       renderItem={({ item }) => (
  <View style={styles.card}>
    <TouchableOpacity
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
      >
        {item.title}
      </Text>

      <Text
        style={styles.uri}
        numberOfLines={1}
      >
        Downloaded Offline
      </Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.deleteBtn}
      onPress={() =>
        handleDelete(item.id)
      }
    >
      <Text
        style={styles.deleteText}
      >
        Remove Download
      </Text>
    </TouchableOpacity>
  </View>
        )}
      />
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        "#0D0D0D",
      padding: 20,
    },

    title: {
      color: "#fff",
      fontSize: 24,
      fontWeight: "700",
      marginBottom: 20,
    },

    empty: {
      color: "#AAA",
      textAlign: "center",
      marginTop: 50,
    },

    card: {
      backgroundColor:
        "#1A1A1A",
      padding: 15,
      borderRadius: 12,
      marginBottom: 12,
    },

    mediaTitle: {
      color: "#FFF",
      fontSize: 16,
      fontWeight: "600",
    },

    uri: {
      color: "#999",
      marginTop: 5,
      fontSize: 12,
    },

    deleteBtn: {
      marginTop: 12,
      backgroundColor:
        "#C0392B",
      padding: 10,
      borderRadius: 8,
    },

    deleteText: {
      color: "#FFF",
      textAlign:
        "center",
      fontWeight: "600",
    },
  });