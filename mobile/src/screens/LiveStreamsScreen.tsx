import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Image } from "expo-image";
import { router } from "expo-router";

import {
  getLiveStreams,
} from "../api/liveStreamApi";
import { AppTheme } from "../constants/theme";

/*
 * Phase 29 — live discovery. Cards show the real thumbnail (or a themed
 * placeholder), creator identity, a LIVE badge and the server-tracked
 * viewer count. Tapping a card opens the live player.
 */

function formatViewers(count: number) {
  const n = Math.max(0, Number(count) || 0);
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M watching`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K watching`;
  return `${n} watching`;
}

export default function LiveStreamsScreen() {
  const [streams, setStreams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadStreams = useCallback(async () => {
    try {
      const data = await getLiveStreams();
      setStreams(Array.isArray(data) ? data : []);
      setError("");
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.message ||
          "Unable to load live streams."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStreams();

    const timer = setInterval(loadStreams, 10000);

    return () => clearInterval(timer);
  }, [loadStreams]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStreams();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.state}>
        <ActivityIndicator color={AppTheme.colors.accent} />
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
      keyExtractor={(item) => item._id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={AppTheme.colors.accent}
        />
      }
      ListHeaderComponent={
        <>
          <Text style={styles.kicker}>Live</Text>
          <Text style={styles.title}>Streaming Now</Text>
          {!!error && <Text style={styles.error}>{error}</Text>}
        </>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>
          No live streams are active right now. Check back soon — or go live
          yourself from the Creator Live Studio.
        </Text>
      }
      renderItem={({ item }) => {
        const creator =
          typeof item.creatorId === "object" ? item.creatorId : null;
        const creatorId = creator?._id || item.creatorId;

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
                  videoUrl: item.playbackUrl,
                  title: item.title,
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

              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveBadgeText}>LIVE</Text>
              </View>

              <View style={styles.viewerPill}>
                <Text style={styles.viewerPillText}>
                  {formatViewers(item.viewers)}
                </Text>
              </View>
            </View>

            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.title}
            </Text>

            <View style={styles.creatorRow}>
              {creator?.avatar ? (
                <Image
                  source={{ uri: creator.avatar }}
                  style={styles.avatar}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]} />
              )}

              <Text style={styles.creatorName} numberOfLines={1}>
                {creator?.displayName || "Creator"}
                {creator?.verified ? " ✓" : ""}
              </Text>

              {!!item.category && (
                <Text style={styles.category}>{item.category}</Text>
              )}
            </View>
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
    backgroundColor: AppTheme.colors.surface,
    borderColor: AppTheme.colors.border,
    borderWidth: 1,
    borderRadius: AppTheme.radius.md,
    overflow: "hidden",
    marginBottom: 16,
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
    fontSize: 34,
    fontWeight: "900",
  },

  liveBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppTheme.colors.live,
    borderRadius: AppTheme.radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
    marginRight: 5,
  },

  liveBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },

  viewerPill: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(7,8,10,0.72)",
    borderRadius: AppTheme.radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  viewerPillText: {
    color: AppTheme.colors.text,
    fontSize: 12,
    fontWeight: "800",
  },

  cardTitle: {
    color: AppTheme.colors.text,
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 23,
    marginTop: 12,
    marginHorizontal: 14,
  },

  creatorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 14,
    marginHorizontal: 14,
  },

  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: AppTheme.colors.surfaceRaised,
    marginRight: 8,
  },

  avatarPlaceholder: {
    backgroundColor: AppTheme.colors.surfaceRaised,
  },

  creatorName: {
    color: AppTheme.colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
    flexShrink: 1,
  },

  category: {
    color: AppTheme.colors.textSubtle,
    fontSize: 12,
    marginLeft: "auto",
    paddingLeft: 8,
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

