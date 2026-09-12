import React from "react";

import {
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  View,
} from "react-native";

import {
  router,
} from "expo-router";
import { AppTheme } from "../constants/theme";

export default function LiveNowRow({
  streams = [],
}) {
  if (!streams.length) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>
        Live Now
      </Text>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={streams}
        contentContainerStyle={styles.listContent}
        keyExtractor={(item) =>
          item._id
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.78}
            onPress={() => {
              const creatorId =
                typeof item.creatorId ===
                "object"
                  ? item.creatorId?._id
                  : item.creatorId;

              router.push({
                pathname: "/player",
                params: {
                  mediaId: item._id,
                  streamId: item._id,
                  creatorId,
                  title: item.title,
                  videoUrl: item.playbackUrl,
                  isLive: "true",
                },
              });
            }}
          >
            <Text style={styles.badge}>
              LIVE
            </Text>

            <Text
              style={styles.title}
              numberOfLines={2}
            >
              {item.title}
            </Text>

            <Text style={styles.viewer}>
              {item.viewers || 0} watching
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },

  heading: {
    color: AppTheme.colors.text,
    fontSize: 20,
    fontWeight: "800",
    marginHorizontal: 16,
    marginBottom: 10,
  },

  listContent: {
    paddingLeft: 16,
    paddingRight: 2,
  },

  card: {
    width: 180,
    minHeight: 132,
    backgroundColor:
      AppTheme.colors.surface,
    borderRadius:
      AppTheme.radius.md,
    borderWidth: 1,
    borderColor:
      AppTheme.colors.border,
    padding: 14,
    marginRight: 12,
    justifyContent:
      "space-between",
  },

  badge: {
    alignSelf: "flex-start",
    color: AppTheme.colors.live,
    backgroundColor:
      "rgba(242,85,85,0.12)",
    borderRadius:
      AppTheme.radius.sm,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: "900",
  },

  title: {
    color: AppTheme.colors.text,
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 22,
    marginTop: 14,
  },

  viewer: {
    color: AppTheme.colors.textMuted,
    marginTop: 8,
  },
});
