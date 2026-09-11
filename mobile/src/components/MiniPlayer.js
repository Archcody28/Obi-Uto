import React from "react";

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

import {
  router,
} from "expo-router";

import {
  usePlayerStore,
} from "../store/playerStore";

export default function MiniPlayer() {
  const currentMedia =
    usePlayerStore(
      (state) =>
        state.currentMedia
    );

  const playNext =
    usePlayerStore(
      (state) =>
        state.playNext
    );

  const playPrevious =
    usePlayerStore(
      (state) =>
        state.playPrevious
    );

  if (!currentMedia) {
    return null;
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() =>
        
        router.push({
          pathname:
            "/player",

          params:
            currentMedia,
        })
      }
    >
      <View>
        <Text
          style={styles.title}
          numberOfLines={1}
        >
          {
            currentMedia.title
          }
        </Text>

        <Text
          style={styles.subtitle}
        >
          Playing...
        </Text>
      </View>

    <View
  style={{
    flexDirection: "row",
    gap: 20,
  }}
>
  <TouchableOpacity
    onPress={playPrevious}
  >
    <Text
      style={styles.icon}
    >
      ⏮
    </Text>
  </TouchableOpacity>

  <TouchableOpacity
    onPress={playNext}
  >
    <Text
      style={styles.icon}
    >
      ⏭
    </Text>
  </TouchableOpacity>
</View>
    </TouchableOpacity>
  );
}

const styles =
  StyleSheet.create({
    container: {
      position:
        "absolute",

      left: 0,
      right: 0,
      bottom: 0,

      backgroundColor:
        "#1A1A1A",

      padding: 15,

      flexDirection:
        "row",

      justifyContent:
        "space-between",

      alignItems:
        "center",

      borderTopWidth: 1,

      borderTopColor:
        "#333",
    },

    title: {
      color: "#FFF",
      fontWeight: "700",
      maxWidth: 250,
    },

    subtitle: {
      color: "#AAA",
      marginTop: 3,
    },

    icon: {
      color: "#FFF",
      fontSize: 24,
    },
  });
