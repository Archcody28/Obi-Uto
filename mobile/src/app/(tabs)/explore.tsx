import React, { useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { getDiscovery } from "../api/liveStreamApi";
import { AppTheme } from "../constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MediaCard from "../components/MediaCard";

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [refreshing, setRefreshing] = useState(false);
  const lastFetchTime = useRef<number>(0);

  const load = useEffect(() => {
    async function fetch() {
      const now = Date.now();
      if (now - lastFetchTime.current < 1000) {
        return;
      }
      lastFetchTime.current = now;
      setError("");
      try {
        const data = await getDiscovery();
        if (data && typeof data === "object") {
          const liveItems = Array.isArray(data.live) ? data.live : [];
          const upcomingItems = Array.isArray(data.upcoming) ? data.upcoming : [];
          const combined = [
            ...upcomingItems.map((s: any) => ({ ...s, type: "upcoming" })),
            ...liveItems.map((s: any) => ({ ...s, type: "live" })),
          ];
          setVideos(combined);
        } else {
          setVideos(Array.isArray(data) ? data : []);
        }
      } catch (err: any) {
        setError(err?.response?.data?.message || "Could not load discovery items");
      } finally {
        setLoading(false);
        if (refreshing) setRefreshing(false);
      }
    }
    fetch();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setVideos([]);
    setError("");
    load();
    setRefreshing(false);
  };

  if (loading && videos.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={AppTheme.colors.accent} />
        <Text style={styles.loadingText}>Loading discovery...</Text>
      </View>
    );
  }

  if (error && videos.length === 0) {
    return (
      <View style={styles.errorView}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.errorRetry} onPress={load}>
          <Text style={styles.errorRetryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <RefreshControl
        refreshing={refreshing}
        onRefresh={handleRefresh}
        tintColor={AppTheme.colors.accent}
      />
      <FlatList
        data={videos}
        keyExtractor={(item) => String(item._id || item.id || "")}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.78}
            onPress={() => {
              router.push({
                pathname: "/details",
                params: { mediaId: item._id || item.id },
              } as any);
            }}
          >
            <View style={styles.cardContent}>
              <Image
                source={{ uri: item.thumbnail || item.banner || undefined }}
                style={styles.thumb}
              />
              <View style={styles.cardInfo}>
                <Text style={styles.mediaTitle}>{item.title || "Untitled"}</Text>
                <Text style={styles.mediaMeta}>
                  {item.viewCount ?? item.likeCount ?? "—"} views
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={(
          <Text style={styles.empty}>No discovery items available</Text>
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
    paddingTop: AppTheme.spacing.lg + insets.top,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: AppTheme.spacing.lg,
  },
  loadingText: {
    color: AppTheme.colors.text,
    marginTop: AppTheme.spacing.sm,
  },
  errorView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: AppTheme.spacing.lg,
  },
  errorText: {
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.subtitle.fontSize,
    marginVertical: AppTheme.spacing.md,
    textAlign: "center",
  },
  errorRetry: {
    marginTop: AppTheme.spacing.md,
  },
  errorRetryText: {
    color: AppTheme.colors.accent,
    fontWeight: "700",
  },
  list: { paddingBottom: 96 },
  empty: {
    color: AppTheme.colors.textSubtle,
    textAlign: "center",
    marginTop: 44,
  },
  card: {
    backgroundColor: AppTheme.colors.surface,
    borderColor: AppTheme.colors.border,
    borderWidth: 1,
    borderRadius: AppTheme.radius.md,
    overflow: "hidden",
    marginBottom: AppTheme.spacing.md,
  },
  cardContent: {
    flexDirection: "row",
    padding: AppTheme.spacing.md,
  },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: AppTheme.radius.sm,
    backgroundColor: AppTheme.colors.surfaceSoft,
  },
  cardInfo: {
    flex: 1,
    marginHorizontal: AppTheme.spacing.md,
  },
  mediaTitle: {
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.subtitle.fontSize,
    fontWeight: "800",
    lineHeight: 21,
  },
  mediaMeta: {
    color: AppTheme.colors.textSubtle,
    marginTop: 4,
    fontSize: 12,
  },
});