import React, { useEffect, useState } from "react";

import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useDownloadStore } from "../store/downloadStore";
import { useFavoritesStore } from "../store/favoritesStore";
import { useWatchStore } from "../store/watchStore";
import { AppTheme } from "../constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getFavorites,
  removeFavorite as removeFavoriteApi,
} from "../api/favoriteApi";
import { continueWatching } from "../api/watchApi";

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();

  // --- Tab state ---
  const [activeTab, setActiveTab] = useState<'liked' | 'history' | 'downloads'>('liked');

  // --- Liked Media tab ---
  const { favorites, addFavorite, removeFavorite, clearFavorites } = useFavoritesStore();

  const [apiFavorites, setApiFavorites] = useState<any[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(true);
  const [favoritesError, setFavoritesError] = useState("");

  useEffect(() => {
    async function loadApiFavorites() {
      setFavoritesError("");
      try {
        const data = await getFavorites();
        setApiFavorites(data || []);
      } catch (err) {
        setFavoritesError("Could not load server favorites");
      } finally {
        setFavoritesLoading(false);
      }
    }
    loadApiFavorites();
  }, []);

  // Sync favorites store with server favorites on load
  useEffect(() => {
    setApiFavorites(favorites);
  }, [favorites]);

  const itemsLiked = [...apiFavorites].map((item: any) => ({
    ...item,
    mediaId: item.mediaId || item._id || item.id,
    favoriteSource: "server",
  }));

  // --- Watch History tab ---
  const [watchLoading, setWatchLoading] = useState(true);
  const [watchError, setWatchError] = useState("");
  const watch = useWatchStore((state) => state.watching);

  useEffect(() => {
    async function loadWatchHistory() {
      setWatchError("");
      try {
        const data = await continueWatching();
        // Store progress in watch store for persistence
        if (Array.isArray(data)) {
          data.forEach((item: any) => useWatchStore.getState().saveProgress(item));
        }
        setWatchLoading(false);
      } catch (err) {
        console.log("Load watch history error:", err);
        setWatchError("Could not load watch history");
        setWatchLoading(false);
      }
    }
    loadWatchHistory();
  }, []);

  // Combined history data: store watching + API continue watching
  const historyItems = useWatchStore.getState().watching.length > 0
    ? useWatchStore.getState().watching
    : apiFavorites.filter((item: any) => item.progress !== undefined);
  const [downloadsLoading, setDownloadsLoading] = useState(true);
  const [downloadsError, setDownloadsError] = useState("");
  const downloadStore = useDownloadStore.getState();

  useEffect(() => {
    async function loadDownloadsData() {
      setDownloadsError("");
      try {
        await downloadStore.loadDownloads();
      } catch (err) {
        setDownloadsError("Could not load downloads");
      } finally {
        setDownloadsLoading(false);
      }
    }
    loadDownloadsData();
  }, [downloadStore]);

  // Helper to safely get media info
  const getMediaMeta = (item: any, source: "liked" | "history" | "downloads") => {
    switch (source) {
      case "liked":
        return {
          title: item.title || "Untitled",
          meta: item.favoriteSource === "server"
            ? `${item.type || ""} • ${item.year || ""}`
            : "Local",
          thumbnail: item.thumbnail || item.banner || item.videoUrl || undefined,
        };
      case "history":
        const progress = item.progress ?? 0;
        const total = item.duration ?? 0;
        const pct = total > 0 ? Math.round((progress / total) * 100) : 0;
        return {
          title: item.title || "Untitled",
          meta: `${pct}% watched`,
          thumbnail: item.thumbnail || item.banner || item.videoUrl || undefined,
        };
      case "downloads":
        return {
          title: item.title || "Untitled",
          meta: item.status === "completed" ? "Available offline" : item.error || "Downloading",
          thumbnail: item.thumbnail || item.banner || item.videoUrl || undefined,
        };
      case "downloads":
        return {
          title: item.title || "Untitled",
          meta: item.status === "completed" ? "Available offline" : item.error || "Downloading",
          thumbnail: item.thumbnail || item.banner || item.videoUrl || undefined,
        };
    }
  };

  // --- Tab renderers ---

  const renderLikedSection = () => {
    if (favoritesLoading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={AppTheme.colors.accent} />
          <Text style={styles.loadingText}>Loading liked media...</Text>
        </View>
      );
    }

    if (favoritesError && itemsLiked.length === 0) {
      return (
        <View style={styles.errorView}>
          <Text style={styles.errorText}>{favoritesError}</Text>
          <TouchableOpacity style={styles.errorRetry} onPress={() => setFavoritesError("")}>
            <Text style={styles.errorRetryText}>Try again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.defaultLink} onPress={() => router.push("/")}>
            <Text style={styles.defaultLinkText}>Browse Media</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const likedItems = itemsLiked.filter((item: any) => item.mediaId);

    if (likedItems.length === 0) {
      return (
        <View style={styles.emptyView}>
          <Text style={styles.emptyText}>No liked media</Text>
          <TouchableOpacity style={styles.defaultLink} onPress={() => router.push("/")}>
            <Text style={styles.defaultLinkText}>Browse Media</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        data={likedItems}
        renderItem={({ item }: any) => {
          const meta = getMediaMeta(item, "liked");
          return (
            <TouchableOpacity style={styles.card} activeOpacity={0.78} onPress={() => router.push(`/details/${item.mediaId}`)}>
              <View style={styles.thumbContainer}>
                <Image source={{ uri: meta.thumbnail }} style={styles.thumb} />
              </View>
              <View style={styles.details}>
                <Text style={styles.title}>{meta.title}</Text>
                <Text style={styles.meta}>{meta.meta}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.list}
        keyExtractor={(item: any) => String(item.mediaId || item.id)}
      />
    );
  };

  const renderHistorySection = () => {
    if (watchLoading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={AppTheme.colors.accent} />
          <Text style={styles.loadingText}>Loading watch history...</Text>
        </View>
      );
    }

    if (watchError && watch.length === 0) {
      return (
        <View style={styles.errorView}>
          <Text style={styles.errorText}>{watchError}</Text>
          <TouchableOpacity style={styles.errorRetry} onPress={() => {}}>
            <Text style={styles.errorRetryText}>Try again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.defaultLink} onPress={() => router.push("/")}>
            <Text style={styles.defaultLinkText}>Browse Media</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (watch.length === 0) {
      return (
        <View style={styles.emptyView}>
          <Text style={styles.emptyText}>No watch history</Text>
          <TouchableOpacity style={styles.defaultLink} onPress={() => router.push("/")}>
            <Text style={styles.defaultLinkText}>Browse Media</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        data={watch}
        renderItem={({ item }: any) => {
          const meta = getMediaMeta(item, "history");
          return (
            <TouchableOpacity style={styles.card} activeOpacity={0.78} onPress={() => router.push(`/details/${item.id}`)}>
              <View style={styles.thumbContainer}>
                <Image source={{ uri: meta.thumbnail }} style={styles.thumb} />
              </View>
              <View style={styles.details}>
                <Text style={styles.title}>{meta.title}</Text>
                <Text style={styles.meta}>{meta.meta}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.list}
        keyExtractor={(item: any) => String(item.id || item.mediaId)}
      />
    );
  };

  const renderDownloadsSection = () => {
    if (downloadsLoading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={AppTheme.colors.accent} />
          <Text style={styles.loadingText}>Loading downloads...</Text>
        </View>
      );
    }

    if (downloadsError && downloadStore.downloads.length === 0) {
      return (
        <View style={styles.errorView}>
          <Text style={styles.errorText}>{downloadsError}</Text>
          <TouchableOpacity style={styles.errorRetry} onPress={() => setDownloadsError("")}>
            <Text style={styles.errorRetryText}>Try again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.defaultLink} onPress={() => router.push("/")}>
            <Text style={styles.defaultLinkText}>Browse Media</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const completedItems = downloadStore.downloads.filter((d: any) => d.status === "completed");

    if (completedItems.length === 0) {
      return (
        <View style={styles.emptyView}>
          <Text style={styles.emptyText}>No downloaded items</Text>
          <TouchableOpacity style={styles.defaultLink} onPress={() => router.push("/")}>
            <Text style={styles.defaultLinkText}>Browse Media</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        data={completedItems}
        renderItem={({ item }: any) => {
          const meta = getMediaMeta(item, "downloads");
          return (
            <TouchableOpacity style={styles.card} activeOpacity={0.78} onPress={() => router.push(`/details/${item.mediaId || item.id}`)}>
              <View style={styles.thumbContainer}>
                <Image source={{ uri: meta.thumbnail }} style={styles.thumb} />
              </View>
              <View style={styles.details}>
                <Text style={styles.title}>{meta.title}</Text>
                <Text style={styles.meta}>{meta.meta}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.list}
        keyExtractor={(item: any) => String(item.mediaId || item.id)}
      />
    );
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.tabBarContainer}>
        <View
          style={[
            styles.tabButton,
            activeTab === "liked" && styles.tabButtonActive,
          ]}
          onPress={() => setActiveTab("liked")}
        >
          <Text style={styles.tabLabel}>Liked Media</Text>
        </View>
        <View
          style={[
            styles.tabButton,
            activeTab === "history" && styles.tabButtonActive,
          ]}
          onPress={() => setActiveTab("history")}
        >
          <Text style={styles.tabLabel}>Watch History</Text>
        </View>
        <View
          style={[
            styles.tabButton,
            activeTab === "downloads" && styles.tabButtonActive,
          ]}
          onPress={() => setActiveTab("downloads")}
        >
          <Text style={styles.tabLabel}>Downloads</Text>
        </View>
      </View>

      <View style={styles.tabLine} />

      <View style={styles.tabPanel}>
        {activeTab === "liked" && renderLikedSection()}
        {activeTab === "history" && renderHistorySection()}
        {activeTab === "downloads" && renderDownloadsSection()}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    padding: AppTheme.spacing.lg,
    paddingTop: AppTheme.spacing.lg + insets.top,
    paddingBottom: insets.bottom,
  },
  tabBarContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: AppTheme.spacing.md,
    paddingHorizontal: AppTheme.spacing.sm,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: AppTheme.spacing.xs,
    borderRadius: AppTheme.radius.md,
  },
  tabButtonActive: {
    backgroundColor: AppTheme.colors.accent,
  },
  tabLabel: {
    color: AppTheme.colors.textSubtle,
    fontSize: AppTheme.typography.caption.fontSize,
    fontWeight: "600",
    marginTop: 2,
  },
  tabLine: {
    height: 3,
    width: "100%",
    backgroundColor: AppTheme.colors.accent,
    marginTop: AppTheme.spacing.xs,
  },
  tabPanel: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
    fontWeight: "800",
    marginBottom: AppTheme.spacing.md,
  },
  errorRetry: {
    marginTop: AppTheme.spacing.md,
  },
  errorRetryText: {
    color: AppTheme.colors.accent,
    fontWeight: "700",
  },
  emptyView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: AppTheme.spacing.lg,
  },
  emptyText: {
    color: AppTheme.colors.textMuted,
    fontSize: AppTheme.typography.subtitle.fontSize,
    marginBottom: AppTheme.spacing.md,
  },
  defaultLink: {
    color: AppTheme.colors.accent,
    fontSize: AppTheme.typography.subtitle.fontSize,
    fontWeight: "600",
    marginTop: AppTheme.spacing.xs,
  },
  defaultLinkText: {
    color: AppTheme.colors.accent,
    fontWeight: "700",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppTheme.colors.surface,
    borderColor: AppTheme.colors.border,
    borderWidth: 1,
    borderRadius: AppTheme.radius.md,
    overflow: "hidden",
    marginBottom: AppTheme.spacing.md,
    padding: AppTheme.spacing.md,
  },
  thumbContainer: {
    width: 80,
    height: 80,
    borderRadius: AppTheme.radius.sm,
    backgroundColor: AppTheme.colors.surfaceSoft,
    marginRight: AppTheme.spacing.md,
  },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: AppTheme.radius.sm,
  },
  details: {
    flex: 1,
  },
  title: {
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.subtitle.fontSize,
    fontWeight: "800",
    lineHeight: 21,
    marginRight: 8,
  },
  meta: {
    color: AppTheme.colors.textSubtle,
    marginTop: 4,
    fontSize: 12,
  },
  list: { paddingBottom: 96 },
});
