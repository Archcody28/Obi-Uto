import React from "react";

import {
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  View,
} from "react-native";

import { Image } from "expo-image";
import { router } from "expo-router";
import { AppTheme } from "../constants/theme";

/*
 * Phase 29 — "Live Now" home row with real thumbnails, creator identity,
 * LIVE badge and server-tracked viewer counts.
 */
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
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => {
          const creator =
            typeof item.creatorId === "object"
              ? item.creatorId
              : null;
          const creatorId = creator?._id || item.creatorId;

          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.78}
              onPress={() =>
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
                })
              }
            >
              <View style={styles.thumbnailWrap}>
                {item.thumbnail ? (
                  <Image
                    source={{ uri: item.thumbnail }}
                    style={styles.thumbnail}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
                    <Text style={styles.thumbnailPlaceholderText}>LIVE</Text>
                  </View>
                )}

                <View style={styles.badge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.badgeText}>LIVE</Text>
                </View>
              </View>

              <Text
                style={styles.title}
                numberOfLines={2}
              >
                {item.title}
              </Text>

              <View style={styles.metaRow}>
                {creator?.avatar ? (
                  <Image
                    source={{ uri: creator.avatar }}
                    style={styles.avatar}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.avatar} />
                )}

                <Text style={styles.creator} numberOfLines={1}>
                  {creator?.displayName || "Creator"}
                </Text>
              </View>

              <Text style={styles.viewer}>
                {Math.max(0, Number(item.viewers) || 0)} watching
              </Text>
            </TouchableOpacity>
          );
        }}
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
    width: 220,
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.md,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    marginRight: 12,
    overflow: "hidden",
  },

  thumbnailWrap: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: AppTheme.colors.surfaceSoft,
  },

  thumbnail: {
    width: "100%",
    height: "100%",
  },

  thumbnailPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },

  thumbnailPlaceholderText: {
    color: "rgba(242,85,85,0.35)",
    fontSize: 24,
    fontWeight: "900",
  },

  badge: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppTheme.colors.live,
    borderRadius: AppTheme.radius.sm,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },

  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
    marginRight: 4,
  },

  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },

  title: {
    color: AppTheme.colors.text,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20,
    marginTop: 10,
    marginHorizontal: 10,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    marginHorizontal: 10,
  },

  avatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: AppTheme.colors.surfaceRaised,
    marginRight: 6,
  },

  creator: {
    color: AppTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    flexShrink: 1,
  },

  viewer: {
    color: AppTheme.colors.textSubtle,
    fontSize: 12,
    marginTop: 4,
    marginBottom: 10,
    marginHorizontal: 10,
  },
});
