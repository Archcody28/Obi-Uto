import React, {
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { router } from "expo-router";

import {
  getLiveStreams,
} from "../api/liveStreamApi";
import { AppTheme } from "../constants/theme";

export default function LiveStreamsScreen() {
  const [
    streams,
    setStreams,
  ] = useState<any[]>([]);
  const [
    loading,
    setLoading,
  ] = useState(true);
  const [
    error,
    setError,
  ] = useState("");

  const loadStreams = () =>
    getLiveStreams()
      .then((data) => {
        setStreams(data || []);
        setError("");
      })
      .catch((err) => {
        console.error(err);
        setError(
          "Unable to load live streams."
        );
      })
      .finally(() =>
        setLoading(false)
      );

  useEffect(() => {
    loadStreams();

    const timer = setInterval(
      loadStreams,
      10000
    );

    return () =>
      clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <View style={styles.state}>
        <ActivityIndicator
          color={AppTheme.colors.accent}
        />
        <Text style={styles.stateText}>
          Loading live streams...
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={streams}
      keyExtractor={(item) =>
        item._id
      }
      ListHeaderComponent={
        <>
          <Text style={styles.kicker}>
            Live
          </Text>
          <Text style={styles.title}>
            Streaming Now
          </Text>
          {!!error && (
            <Text style={styles.error}>
              {error}
            </Text>
          )}
        </>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>
          No live streams are active right now.
        </Text>
      }
      renderItem={({ item }) => {
        const creatorId =
          typeof item.creatorId ===
          "object"
            ? item.creatorId?._id
            : item.creatorId;

        return (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.78}
            accessibilityRole="button"
            accessibilityLabel={`Open ${item.title || "live stream"}`}
            onPress={() =>
              router.push({
                pathname: "/player",
                params: {
                  mediaId: item._id,
                  streamId: item._id,
                  creatorId,
                  videoUrl:
                    item.playbackUrl,
                  title: item.title,
                  isLive: "true",
                },
              })
            }
          >
            <Text style={styles.badge}>
              LIVE
            </Text>

            <Text
              style={styles.cardTitle}
              numberOfLines={2}
            >
              {item.title}
            </Text>

            <Text style={styles.meta}>
              {item.viewers || 0} watching
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppTheme.colors.background,
  },

  content: {
    padding: 20,
    paddingBottom: 96,
  },

  kicker: {
    color: AppTheme.colors.accent,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    marginTop: 10,
  },

  title: {
    color: AppTheme.colors.text,
    fontSize: 30,
    fontWeight: "900",
    marginTop: 4,
    marginBottom: 18,
  },

  card: {
    minHeight: 118,
    justifyContent: "space-between",
    backgroundColor: AppTheme.colors.surface,
    borderColor: AppTheme.colors.border,
    borderWidth: 1,
    borderRadius: AppTheme.radius.md,
    padding: 16,
    marginBottom: 12,
  },

  badge: {
    alignSelf: "flex-start",
    color: AppTheme.colors.live,
    backgroundColor: "rgba(242,85,85,0.12)",
    borderRadius: AppTheme.radius.sm,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: "900",
  },

  cardTitle: {
    color: AppTheme.colors.text,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 24,
    marginTop: 12,
  },

  meta: {
    color: AppTheme.colors.textMuted,
    marginTop: 8,
  },

  state: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppTheme.colors.background,
    padding: 24,
  },

  stateText: {
    color: AppTheme.colors.textMuted,
    marginTop: 10,
  },

  empty: {
    color: AppTheme.colors.textMuted,
    textAlign: "center",
    marginTop: 36,
    lineHeight: 21,
  },

  error: {
    color: AppTheme.colors.danger,
    marginBottom: 14,
  },
});
