import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  searchMedia,
} from "../api/searchApi";
import MediaCard from "../components/MediaCard";
import { AppTheme } from "../constants/theme";

const RECENT_STORAGE_KEY = "@obi-uto:recent_searches";
const MAX_RECENT = 8;

// PHASE F — supported search categories.
//
// searchMedia:     GET /api/media/search?q=...   SUPPORTED (creator + Internet Archive)
// searchCreators:  NO backend endpoint — unsupported, documented honestly
// searchLiveStreams: NO backend endpoint — unsupported, documented honestly
//
// Only media search is implemented. Creator and live-stream search categories
// are intentionally omitted because no corresponding backend routes exist.

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [recentLoaded, setRecentLoaded] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  // PHASE 27 — unified contract meta (single search box, both sources).
  const [creatorCount, setCreatorCount] = useState(0);
  const [externalCount, setExternalCount] = useState(0);
  const [externalUnavailable, setExternalUnavailable] = useState(false);
  // Debounce typing so we don't spam the provider on every keystroke;
  // submit still searches immediately. Guard against out-of-order responses.
  const debounceRef = useRef<any>(null);
  const requestRef = useRef(0);

  const resetMeta = () => {
    setCreatorCount(0);
    setExternalCount(0);
    setExternalUnavailable(false);
  };

  // ── Recent searches (AsyncStorage persisted) ──────────────────────────
  const loadRecentSearches = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(RECENT_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        setRecentSearches(parsed.slice(0, MAX_RECENT));
      }
    } catch {
      // ignore storage errors — recent searches are a nicety, not critical
    } finally {
      setRecentLoaded(true);
    }
  }, []);

  const saveRecentSearch = useCallback(async (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    try {
      const updated = [trimmed, ...recentSearches.filter((s) => s !== trimmed)].slice(0, MAX_RECENT);
      setRecentSearches(updated);
      await AsyncStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore storage errors
    }
  }, [recentSearches]);

  const removeRecentSearch = useCallback(async (term: string) => {
    try {
      const updated = recentSearches.filter((s) => s !== term);
      setRecentSearches(updated);
      await AsyncStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore storage errors
    }
  }, [recentSearches]);

  const clearRecentSearches = useCallback(async () => {
    try {
      setRecentSearches([]);
      await AsyncStorage.removeItem(RECENT_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    loadRecentSearches();
  }, [loadRecentSearches]);

  const doSearch =
    async (q: string) => {
      const term = (q ?? "").trim();

      if (!term) {
        setResults([]);
        setSearched(false);
        setError("");
        resetMeta();
        return;
      }

      // Persist to recent searches
      void saveRecentSearch(term);

      const myRequest = ++requestRef.current;
      setLoading(true);
      setError("");

      try {
        const data =
          await searchMedia(term);

        if (requestRef.current !== myRequest) return;
        // searchMedia normalizes legacy arrays too; external items keep
        // source:"external" + ia: ids and render via existing MediaCard/
        // Details/Player flow (Phase 26 restrictions enforced there).
        const list = Array.isArray(data)
          ? data
          : data?.results || [];
        setResults(list);
        setCreatorCount(Array.isArray(data) ? list.length : data?.creatorCount ?? 0);
        setExternalCount(Array.isArray(data) ? 0 : data?.externalCount ?? 0);
        setExternalUnavailable(Array.isArray(data) ? false : !!data?.externalUnavailable);
        setSearched(true);
      } catch (err: any) {
        if (requestRef.current !== myRequest) return;
        console.log(err);
        // Empty-query rejections come back 400 — surface honestly, keep prior.
        setError(
          err?.response?.data
            ?.message ||
            err?.response?.data
              ?.error ||
            "Search failed. Please try again."
        );
        setResults([]);
        resetMeta();
        setSearched(true);
      } finally {
        if (requestRef.current === myRequest) setLoading(false);
      }
    };

  // Debounced search-as-you-type (500ms); submit searches immediately.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const term = (query ?? "").trim();
    if (!term) {
      setResults([]);
      setSearched(false);
      setError("");
      resetMeta();
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => doSearch(query), 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const retry = () => doSearch(query);

  const clearInput = () => {
    setQuery("");
    setResults([]);
    setSearched(false);
    setError("");
    resetMeta();
    setLoading(false);
  };

  const handleRecentPress = (term: string) => {
    setQuery(term);
  };

  const hasContent = query.trim().length > 0 || results.length > 0 || !!error || loading;

  const renderSkeleton = () => (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonImage} />
      <View style={styles.skeletonTextLine} />
      <View style={styles.skeletonTextLineShort} />
    </View>
  );

  const renderSkeletonGrid = () => {
    const rows = [];
    for (let r = 0; r < 2; r++) {
      const rowItems = [];
      for (let c = 0; c < 2; c++) {
        rowItems.push(renderSkeleton());
      }
      rows.push(
        <View key={`skel-row-${r}`} style={styles.skeletonRow}>
          {rowItems}
        </View>
      );
    }
    return rows;
  };

  return (
    <ScrollView
      style={[
        styles.container,
        {
          paddingTop: AppTheme.spacing.lg + insets.top,
          paddingBottom: insets.bottom + 96,
        },
      ]}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.kicker}>
          Discover
        </Text>
        <Text style={styles.title}>
          Search Obi-Uto
        </Text>
      </View>

      {/* ── Search input row ── */}
      <View style={styles.inputRow}>
        <TextInput
          placeholder="Movies, series, music, podcasts"
          placeholderTextColor={AppTheme.colors.textSubtle}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => doSearch(query)}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          spellCheck={false}
          style={styles.input}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          editable={!loading}
        />
        {query.trim().length > 0 && inputFocused && (
          <Pressable
            onPress={clearInput}
            style={styles.clearButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.clearText}>×</Text>
          </Pressable>
        )}
      </View>

      {/* ── Recent searches (shown when idle, no active query/results) ── */}
      {!hasContent && recentLoaded && (
        <View style={styles.recentSection}>
          <View style={styles.recentHeaderRow}>
            <Text style={styles.recentHeading}>Recent searches</Text>
            {recentSearches.length > 0 && (
              <Text style={styles.recentClear} onPress={clearRecentSearches}>
                Clear all
              </Text>
            )}
          </View>
          {recentSearches.length === 0 ? (
            <Text style={styles.recentEmpty}>
              No recent searches yet.
            </Text>
          ) : (
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={recentSearches}
              keyExtractor={(item, index) => `recent-${index}`}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleRecentPress(item)}
                  style={styles.recentChip}
                >
                  <Text style={styles.recentChipText}>{item}</Text>
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      void removeRecentSearch(item);
                    }}
                    style={styles.recentRemove}
                  >
                    <Text style={styles.recentRemoveText}>×</Text>
                  </Pressable>
                </Pressable>
              )}
              contentContainerStyle={styles.recentList}
            />
          )}
        </View>
      )}

      {/* ── Loading state ── */}
      {loading && !error && (
        <View style={styles.stateCard}>
          <ActivityIndicator
            color={AppTheme.colors.accent}
            size="large"
          />
          <Text style={styles.stateText}>
            Searching...
          </Text>
        </View>
      )}

      {/* ── Skeleton grid while results are fetching ── */}
      {loading && !error && !searched && (
        <View style={styles.skeletonContainer}>
          <Text style={styles.skeletonHeading}>
            Results
          </Text>
          {renderSkeletonGrid()}
        </View>
      )}

      {/* ── Error state ── */}
      {!!error && (
        <View style={styles.stateCard}>
          <Text style={styles.error}>
            {error}
          </Text>
          <Text style={styles.retry} onPress={retry}>
            Tap to retry
          </Text>
        </View>
      )}

      {/* ── Empty state ── */}
      {searched &&
        !loading &&
        !error &&
        results.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>
              No results found
            </Text>
            <Text style={styles.emptySubtitle}>
              Try another title, creator, or keyword.
            </Text>
          </View>
        )}

      {/* ── Results ── */}
      {!loading &&
        !error &&
        results.length > 0 && (
          <>
            <View style={styles.resultsHeader}>
              <Text style={styles.heading}>
                {results.length} result
                {results.length === 1 ? "" : "s"}
                {` • ${creatorCount} Obi-Uto • ${externalCount} Archive`}
              </Text>
              {externalUnavailable && (
                <Text style={styles.providerNote}>
                  Internet Archive results unavailable — showing Obi-Uto titles.
                </Text>
              )}
            </View>
            <FlatList
              data={results}
              keyExtractor={(item: any, index: number) =>
                (item._id?.toString() || item.id?.toString() || `row-${index}`)
              }
              numColumns={2}
              columnWrapperStyle={styles.columns}
              contentContainerStyle={styles.results}
              renderItem={({ item }) => (
                <MediaCard item={item} />
              )}
            />
          </>
        )}
    </ScrollView>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: AppTheme.colors.background,
    },

    scrollContent: {
      padding: AppTheme.spacing.lg,
      paddingBottom: AppTheme.spacing.xxl,
      flexGrow: 1,
    },

    header: {
      marginBottom: AppTheme.spacing.xl,
    },

    kicker: {
      color: AppTheme.colors.accent,
      fontSize: AppTheme.typography.kicker.fontSize,
      fontWeight: AppTheme.typography.kicker.fontWeight,
      letterSpacing: AppTheme.typography.kicker.letterSpacing,
      textTransform: "uppercase",
      marginBottom: AppTheme.spacing.sm,
    },

    title: {
      color: AppTheme.colors.text,
      fontSize: AppTheme.typography.display.fontSize,
      fontWeight: AppTheme.typography.display.fontWeight,
      marginTop: AppTheme.spacing.xs,
      marginBottom: AppTheme.spacing.lg,
      letterSpacing: AppTheme.typography.display.letterSpacing,
    },

    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: AppTheme.spacing.xl,
    },

    input: {
      flex: 1,
      minHeight: 54,
      backgroundColor: AppTheme.colors.input,
      color: AppTheme.colors.text,
      paddingHorizontal: AppTheme.spacing.lg,
      paddingRight: 44,
      borderRadius: AppTheme.radius.md,
      borderWidth: 1,
      borderColor: AppTheme.colors.border,
      fontSize: AppTheme.typography.body.fontSize,
    },

    clearButton: {
      position: "absolute",
      right: 12,
      alignItems: "center",
      justifyContent: "center",
    },

    clearText: {
      color: AppTheme.colors.textSubtle,
      fontSize: 22,
      lineHeight: 22,
    },

    recentSection: {
      marginBottom: AppTheme.spacing.xl,
    },

    recentHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: AppTheme.spacing.md,
    },

    recentHeading: {
      color: AppTheme.colors.textMuted,
      fontSize: AppTheme.typography.label.fontSize,
      fontWeight: AppTheme.typography.label.fontWeight,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },

    recentClear: {
      color: AppTheme.colors.accent,
      fontSize: AppTheme.typography.caption.fontSize,
      fontWeight: AppTheme.typography.caption.fontWeight,
    },

    recentEmpty: {
      color: AppTheme.colors.textMuted,
      fontSize: AppTheme.typography.body.fontSize,
      textAlign: "center",
      paddingVertical: AppTheme.spacing.lg,
    },

    recentList: {
      paddingRight: AppTheme.spacing.sm,
    },

    recentChip: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: AppTheme.colors.surface,
      borderWidth: 1,
      borderColor: AppTheme.colors.borderSoft,
      borderRadius: AppTheme.radius.pill,
      paddingHorizontal: AppTheme.spacing.md,
      paddingVertical: AppTheme.spacing.sm,
      marginRight: AppTheme.spacing.sm,
      marginBottom: AppTheme.spacing.sm,
    },

    recentChipText: {
      color: AppTheme.colors.text,
      fontSize: AppTheme.typography.body.fontSize,
      marginRight: AppTheme.spacing.sm,
    },

    recentRemove: {
      marginLeft: 4,
    },

    recentRemoveText: {
      color: AppTheme.colors.textSubtle,
      fontSize: 16,
      lineHeight: 16,
    },

    stateCard: {
      alignItems: "center",
      padding: AppTheme.spacing.xl,
      borderRadius: AppTheme.radius.lg,
      backgroundColor: AppTheme.colors.surface,
      borderColor: AppTheme.colors.borderSoft,
      borderWidth: 1,
      marginTop: AppTheme.spacing.xl,
    },

    stateText: {
      color: AppTheme.colors.textMuted,
      marginTop: AppTheme.spacing.sm,
      fontSize: AppTheme.typography.body.fontSize,
    },

    error: {
      color: AppTheme.colors.danger,
      textAlign: "center",
      marginBottom: AppTheme.spacing.sm,
      fontSize: AppTheme.typography.body.fontSize,
    },

    retry: {
      color: AppTheme.colors.accent,
      fontWeight: "800",
      marginTop: AppTheme.spacing.sm,
    },

    providerNote: {
      color: AppTheme.colors.textMuted,
      marginTop: 4,
      marginBottom: 8,
      fontSize: AppTheme.typography.caption.fontSize,
    },

    emptyState: {
      alignItems: "center",
      paddingVertical: AppTheme.spacing.xxl,
      marginTop: AppTheme.spacing.xl,
    },

    emptyIcon: {
      fontSize: 48,
      marginBottom: AppTheme.spacing.md,
    },

    emptyTitle: {
      color: AppTheme.colors.text,
      fontSize: AppTheme.typography.heading.fontSize,
      fontWeight: AppTheme.typography.heading.fontWeight,
      marginBottom: AppTheme.spacing.sm,
      textAlign: "center",
    },

    emptySubtitle: {
      color: AppTheme.colors.textMuted,
      fontSize: AppTheme.typography.body.fontSize,
      textAlign: "center",
      paddingHorizontal: AppTheme.spacing.lg,
    },

    skeletonContainer: {
      marginTop: AppTheme.spacing.xl,
    },

    skeletonHeading: {
      color: AppTheme.colors.textMuted,
      fontSize: AppTheme.typography.label.fontSize,
      fontWeight: AppTheme.typography.label.fontWeight,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: AppTheme.spacing.md,
    },

    skeletonRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: AppTheme.spacing.sm,
    },

    skeletonCard: {
      width: 132,
      height: 240,
      backgroundColor: AppTheme.colors.surfaceSoft,
      borderRadius: AppTheme.radius.md,
      borderWidth: 1,
      borderColor: AppTheme.colors.borderSoft,
      padding: AppTheme.spacing.sm,
    },

    skeletonImage: {
      width: "100%",
      height: 192,
      borderRadius: AppTheme.radius.sm,
      backgroundColor: AppTheme.colors.borderSoft,
    },

    skeletonTextLine: {
      height: 14,
      width: "60%",
      marginTop: AppTheme.spacing.sm,
      backgroundColor: AppTheme.colors.borderSoft,
      borderRadius: 4,
    },

    skeletonTextLineShort: {
      height: 12,
      width: "40%",
      marginTop: AppTheme.spacing.xs,
      backgroundColor: AppTheme.colors.borderSoft,
      borderRadius: 4,
    },

    resultsHeader: {
      marginBottom: AppTheme.spacing.md,
    },

    results: {
      flexGrow: 1,
      paddingBottom: 96,
    },

    columns: {
      gap: AppTheme.spacing.md,
      marginBottom: AppTheme.spacing.xl,
    },
  });
