import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  searchMedia,
} from "../api/searchApi";
import MediaCard from "../components/MediaCard";
import { AppTheme } from "../constants/theme";

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] =
    useState("");
  const [results, setResults] =
    useState<any[]>([]);
  const [loading, setLoading] =
    useState(false);
  const [error, setError] =
    useState("");
  const [searched, setSearched] =
    useState(false);
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

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: AppTheme.spacing.lg + insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <Text style={styles.kicker}>
        Discover
      </Text>
      <Text style={styles.title}>
        Search Obi-Uto
      </Text>

      <TextInput
        placeholder="Movies, series, music, podcasts"
        placeholderTextColor={
          AppTheme.colors.textSubtle
        }
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={() =>
          doSearch(query)
        }
        returnKeyType="search"
        autoCorrect={false}
        style={styles.input}
      />

      {loading && (
        <View style={styles.stateCard}>
          <ActivityIndicator
            color={
              AppTheme.colors.accent
            }
          />
          <Text style={styles.stateText}>
            Searching...
          </Text>
        </View>
      )}

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

      {searched &&
        !loading &&
        !error &&
        results.length === 0 && (
          <Text style={styles.empty}>
            No results found. Try another title.
          </Text>
        )}

      <FlatList
        data={results}
        keyExtractor={(item: any, index: number) =>
          (item._id?.toString() || item.id?.toString() || `row-${index}`)
        }
        numColumns={2}
        columnWrapperStyle={
          styles.columns
        }
        contentContainerStyle={
          styles.results
        }
        ListHeaderComponent={
          results.length > 0 ? (
            <View>
              <Text style={styles.heading}>
                {results.length} result
                {results.length === 1
                  ? ""
                  : "s"}
                {` • ${creatorCount} Obi-Uto • ${externalCount} Archive`}
              </Text>
              {externalUnavailable && (
                <Text style={styles.providerNote}>
                  Internet Archive results unavailable — showing Obi-Uto titles.
                </Text>
              )}
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <MediaCard item={item} />
        )}
      />
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: AppTheme.colors.background,
      padding: AppTheme.spacing.lg,
    },

    kicker: {
      color: AppTheme.colors.accent,
      fontSize: AppTheme.typography.kicker.fontSize,
      fontWeight: AppTheme.typography.kicker.fontWeight,
      letterSpacing: AppTheme.typography.kicker.letterSpacing,
      textTransform: "uppercase",
      marginTop: AppTheme.spacing.md,
    },

    title: {
      color: AppTheme.colors.text,
      fontSize: AppTheme.typography.display.fontSize,
      fontWeight: AppTheme.typography.display.fontWeight,
      marginTop: AppTheme.spacing.xs,
      marginBottom: AppTheme.spacing.xl,
    },

    input: {
      minHeight: 54,
      backgroundColor: AppTheme.colors.input,
      color: AppTheme.colors.text,
      paddingHorizontal: AppTheme.spacing.lg,
      borderRadius: AppTheme.radius.md,
      borderWidth: 1,
      borderColor: AppTheme.colors.border,
      marginBottom: AppTheme.spacing.xl,
    },

    heading: {
      color: AppTheme.colors.text,
      fontSize: AppTheme.typography.heading.fontSize,
      fontWeight: AppTheme.typography.heading.fontWeight,
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

    stateCard: {
      alignItems: "center",
      padding: AppTheme.spacing.xl,
      borderRadius: AppTheme.radius.lg,
      backgroundColor: AppTheme.colors.surface,
      borderColor: AppTheme.colors.borderSoft,
      borderWidth: 1,
    },

    stateText: {
      color:
        AppTheme.colors.textMuted,
      marginTop: 10,
    },

    error: {
      color: AppTheme.colors.danger,
      marginBottom: 12,
    },

    retry: {
      color: AppTheme.colors.accent,
      fontWeight: "800",
      marginTop: 8,
    },

    providerNote: {
      color:
        AppTheme.colors.textMuted,
      marginTop: 4,
      marginBottom: 8,
    },

    empty: {
      color:
        AppTheme.colors.textMuted,
      textAlign: "center",
      marginTop: 36,
      lineHeight: 20,
    },
  });
