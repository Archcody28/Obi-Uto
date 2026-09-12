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

import {
  router,
} from "expo-router";

import {
  useFavoritesStore,
} from "../store/favoritesStore";
import {
  getFavorites,
  removeFavorite as removeFavoriteApi,
} from "../api/favoriteApi";
import { AppTheme } from "../constants/theme";

export default function FavoritesScreen() {
  const storeFavorites =
    useFavoritesStore(
      (state) =>
        state.favorites
    );
  const removeFavorite =
    useFavoritesStore(
      (state) =>
        state.removeFavorite
    );

  const [
    apiFavorites,
    setApiFavorites,
  ] = useState<any[]>([]);
  const [
    loading,
    setLoading,
  ] = useState(true);
  const [
    error,
    setError,
  ] = useState("");

  const loadFavorites =
    async () => {
      setError("");
      try {
        const data =
          await getFavorites();
        setApiFavorites(
          data || []
        );
      } catch (err) {
        console.log(err);
        setError(
          "We could not load server favorites."
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadFavorites();
  }, []);

  const serverItems =
    apiFavorites
      .map((item) => item.media)
      .filter(Boolean);

  const combined = [
    ...serverItems.map((item) => ({
      ...item,
      favoriteSource: "server",
      mediaId: item._id,
    })),
    ...storeFavorites.map((item) => ({
      ...item,
      favoriteSource: "local",
      mediaId:
        item.id || item._id,
    })),
  ].filter(
    (item, index, arr) =>
      item.mediaId &&
      arr.findIndex(
        (candidate) =>
          candidate.mediaId ===
          item.mediaId
      ) === index
  );

  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>
        Library
      </Text>
      <Text style={styles.title}>
        Favorites
      </Text>

      {!!error && (
        <TouchableOpacity
          style={styles.errorCard}
          onPress={loadFavorites}
        >
          <Text style={styles.error}>
            {error}
          </Text>
          <Text style={styles.retry}>
            Tap to retry
          </Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator
            color={
              AppTheme.colors.accent
            }
          />
          <Text style={styles.stateText}>
            Loading favorites...
          </Text>
        </View>
      ) : (
        <FlatList
          data={combined}
          keyExtractor={(item) =>
            item.mediaId
          }
          contentContainerStyle={
            styles.list
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              Titles you save will appear here.
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.78}
              onPress={() =>
                router.push({
                  pathname:
                    "/details",
                  params: {
                    id:
                      item.mediaId,
                  },
                })
              }
            >
              <View style={styles.cardCopy}>
                <Text
                  style={styles.name}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
                <Text style={styles.meta}>
                  {item.favoriteSource ===
                  "server"
                    ? "Saved to account"
                    : "Saved on this device"}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.removeBtn}
                onPress={async () => {
                  try {
                    if (
                      item.favoriteSource ===
                      "server"
                    ) {
                      await removeFavoriteApi(
                        item.mediaId
                      );
                      setApiFavorites(
                        (prev) =>
                          prev.filter(
                            (fav) => {
                              const favMediaId =
                                String(
                                  fav.media?._id ??
                                    fav.media ??
                                    fav._id ??
                                    ""
                                );
                              return (
                                favMediaId !==
                                String(
                                  item.mediaId
                                )
                              );
                            }
                          )
                      );
                    }
                    removeFavorite(
                      item.mediaId
                    );
                  } catch (err) {
                    console.log(
                      err
                    );
                  }
                }}
              >
                <Text
                  style={styles.removeText}
                >
                  Remove
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        AppTheme.colors.background,
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
      fontWeight: "900",
      marginTop: 4,
      marginBottom: AppTheme.spacing.xl,
    },

    list: {
      paddingBottom: 96,
    },

    card: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      backgroundColor:
        AppTheme.colors.surface,
      borderColor:
        AppTheme.colors.border,
      borderWidth: 1,
      padding: AppTheme.spacing.lg,
      borderRadius: AppTheme.radius.md,
      marginBottom: AppTheme.spacing.md,
      gap: AppTheme.spacing.md,
    },

    cardCopy: {
      flex: 1,
    },

    name: {
      color: AppTheme.colors.text,
      fontSize: AppTheme.typography.subtitle.fontSize,
      fontWeight: "800",
      lineHeight: 21,
    },

    meta: {
      color:
        AppTheme.colors.textSubtle,
      marginTop: 5,
      fontSize: 12,
    },

    removeBtn: {
      minHeight: 40,
      justifyContent: "center",
      borderRadius:
        AppTheme.radius.sm,
      backgroundColor:
        AppTheme.colors.surfaceSoft,
      paddingHorizontal: 12,
    },

    removeText: {
      color: AppTheme.colors.text,
      fontWeight: "800",
    },

    stateCard: {
      padding: 18,
      alignItems: "center",
      backgroundColor:
        AppTheme.colors.surface,
      borderRadius:
        AppTheme.radius.lg,
      borderWidth: 1,
      borderColor:
        AppTheme.colors.border,
    },

    stateText: {
      color:
        AppTheme.colors.textMuted,
      marginTop: AppTheme.spacing.md,
    },

    empty: {
      color:
        AppTheme.colors.textMuted,
      textAlign: "center",
      marginTop: 44,
      lineHeight: 21,
    },

    errorCard: {
      backgroundColor:
        "rgba(225,91,100,0.12)",
      borderColor:
        AppTheme.colors.danger,
      borderWidth: 1,
      borderRadius:
        AppTheme.radius.md,
      padding: 14,
      marginBottom: 16,
    },

    error: {
      color: AppTheme.colors.text,
      fontWeight: "800",
    },

    retry: {
      color: AppTheme.colors.danger,
      marginTop: 4,
      fontWeight: "700",
    },
  });
