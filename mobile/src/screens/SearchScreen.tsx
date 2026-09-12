import React, {
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

import {
  searchMedia,
} from "../api/searchApi";
import MediaCard from "../components/MediaCard";
import { AppTheme } from "../constants/theme";

export default function SearchScreen() {
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

  const doSearch =
    async (q: string) => {
      const term = (q ?? "").trim();

      if (!term) {
        setResults([]);
        setSearched(false);
        setError("");
        return;
      }

      setLoading(true);
      setError("");

      try {
        const data =
          await searchMedia(term);

        setResults(data || []);
        setSearched(true);
      } catch (err: any) {
        console.log(err);
        setError(
          err?.response?.data
            ?.error ||
            "Search failed. Please try again."
        );
        setResults([]);
        setSearched(true);
      } finally {
        setLoading(false);
      }
    };

  return (
    <View style={styles.container}>
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
        <Text style={styles.error}>
          {error}
        </Text>
      )}

      {searched &&
        !loading &&
        !error &&
        results.length === 0 && (
          <Text style={styles.empty}>
            No results found.
          </Text>
        )}

      <FlatList
        data={results}
        keyExtractor={(item: any) =>
          item._id?.toString()
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
            <Text style={styles.heading}>
              {results.length} result
              {results.length === 1
                ? ""
                : "s"}
            </Text>
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

    empty: {
      color:
        AppTheme.colors.textMuted,
      textAlign: "center",
      marginTop: 36,
      lineHeight: 20,
    },
  });
