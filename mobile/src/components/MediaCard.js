import React, { useState } from "react";

import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
} from "react-native";

import { router } from "expo-router";
import { AppTheme } from "../constants/theme";

export default function MediaCard({
  item,
  onPress = null,
  size = "md",
}) {
  const imageUri =
    item?.thumbnail ||
    item?.banner;
  const [errored, setErrored] =
    useState(false);

  const handlePress =
    onPress ||
    (() =>
      router.push({
        pathname: "/details",
        params: {
          id: item._id,
        },
      }));

  const dimensions =
    size === "lg"
      ? { width: 152, height: 224 }
      : { width: 132, height: 192 };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${item?.title || "media"}`}
      style={({ pressed }) => [
        styles.card,
        { width: dimensions.width },
        pressed &&
          styles.cardPressed,
      ]}
    >
      <View
        style={[
          styles.imageWrap,
          {
            width: dimensions.width,
            height: dimensions.height,
          },
        ]}
      >
        {imageUri && !errored ? (
          <Image
            source={{
              uri: imageUri,
            }}
            style={styles.image}
            onError={() =>
              setErrored(true)
            }
          />
        ) : (
          <View
            style={
              styles.imageFallback
            }
          >
            <Text
              style={
                styles.fallbackText
              }
            >
              OBI
            </Text>
          </View>
        )}

        <View
          style={styles.imageSheen}
        />

        <View
          style={styles.playAffordance}
        >
          <View
            style={styles.playIcon}
          >
            <Text
              style={
                styles.playGlyph
              }
            >
              ▶
            </Text>
          </View>
        </View>

        {item?.isPremium && (
          <View style={styles.badge}>
            <Text
              style={styles.badgeText}
            >
              Premium
            </Text>
          </View>
        )}

        {item?.progress != null &&
          item.progress > 0 &&
          item.progress < 100 && (
            <View
              style={
                styles.progressTrack
              }
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(item.progress, 100)}%`,
                  },
                ]}
              />
            </View>
          )}
      </View>

      <Text
        style={styles.title}
        numberOfLines={2}
      >
        {item?.title}
      </Text>

      {!!item?.type && (
        <Text
          style={styles.meta}
          numberOfLines={1}
        >
          {item.type}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginRight: 12,
  },

  cardPressed: {
    opacity: 0.7,
    transform: [
      {
        scale: 0.97,
      },
    ],
  },

  imageWrap: {
    borderRadius:
      AppTheme.radius.md,
    overflow: "hidden",
    backgroundColor:
      AppTheme.colors.surface,
    borderWidth: 1,
    borderColor:
      AppTheme.colors.borderSoft,
  },

  image: {
    width: "100%",
    height: "100%",
  },

  imageSheen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor:
      "rgba(7,8,10,0.04)",
  },

  title: {
    color: AppTheme.colors.text,
    marginTop: 8,
    fontSize:
      AppTheme.typography.subtitle
        .fontSize,
    fontWeight:
      AppTheme.typography.subtitle
        .fontWeight,
    lineHeight: 20,
  },

  meta: {
    color:
      AppTheme.colors.textSubtle,
    marginTop: 2,
    fontSize:
      AppTheme.typography.caption
        .fontSize,
    textTransform:
      "capitalize",
  },

  imageFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor:
      AppTheme.colors.surfaceSoft,
  },

  fallbackText: {
    color:
      AppTheme.colors.textSubtle,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },

  playAffordance: {
    position: "absolute",
    inset: 0,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0,
  },

  playIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor:
      "rgba(7,8,10,0.6)",
    borderWidth: 1,
    borderColor:
      "rgba(248,244,234,0.3)",
  },

  playGlyph: {
    color: AppTheme.colors.text,
    fontSize: 14,
    marginLeft: 2,
  },

  badge: {
    position: "absolute",
    top: 8,
    left: 8,
    borderRadius:
      AppTheme.radius.sm,
    backgroundColor:
      AppTheme.colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  badgeText: {
    color:
      AppTheme.colors.background,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  progressTrack: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor:
      "rgba(248,244,234,0.18)",
  },

  progressFill: {
    height: "100%",
    backgroundColor:
      AppTheme.colors.accent,
  },
});
