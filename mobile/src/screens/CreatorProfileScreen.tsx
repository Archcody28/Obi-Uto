import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  router,
  useLocalSearchParams,
} from "expo-router";

import {
  followCreator,
  getFollowStatus,
  unfollowCreator,
} from "../api/followApi";
import {
  getCreatorById,
  getCreatorContent,
} from "../api/creatorApi";
import { AppTheme } from "../constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function CreatorProfileScreen() {
  const insets = useSafeAreaInsets();
  const params =
    useLocalSearchParams();
  const creatorId =
    Array.isArray(
      params.creatorId
    )
      ? params.creatorId[0]
      : params.creatorId;

  const [
    creator,
    setCreator,
  ] = useState<any>(null);
  const [
    content,
    setContent,
  ] = useState<any[]>([]);
  const [
    following,
    setFollowing,
  ] = useState(false);
  const [
    loading,
    setLoading,
  ] = useState(true);
  const [
    error,
    setError,
  ] = useState("");
  const [
    busy,
    setBusy,
  ] = useState(false);

  const load =
    useCallback(async () => {
      if (!creatorId) {
        setError(
          "This profile is missing a creator ID."
        );
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const [
          profile,
          media,
          status,
        ] = await Promise.all([
          getCreatorById(creatorId).catch(() => null),
          getCreatorContent(creatorId).catch(() => []),
          getFollowStatus(creatorId).catch(() => null),
        ]);

        setCreator(profile);
        setContent(
          Array.isArray(media) ? media : []
        );
        setFollowing(
          Boolean(status?.following)
        );

        if (!profile) {
          setError(
            "We could not load this creator."
          );
        }
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            "We could not load this creator."
        );
      } finally {
        setLoading(false);
      }
    }, [creatorId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFollow =
    async () => {
      if (!creatorId || busy) {
        return;
      }

      const previous = following;
      setBusy(true);
      setFollowing(!previous);

      try {
        if (previous) {
          await unfollowCreator(creatorId);
        } else {
          await followCreator(creatorId);
        }
      } catch (err: any) {
        setFollowing(previous);
        Alert.alert(
          "Follow failed",
          err?.response?.data?.message ||
            "Please try again."
        );
      } finally {
        setBusy(false);
      }
    };

  if (loading) {
    return (
      <View style={styles.state}>
        <ActivityIndicator
          color={
            AppTheme.colors.accent
          }
        />
        <Text style={styles.stateText}>
          Loading creator...
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + 16,
          paddingBottom: 96 + insets.bottom,
        },
      ]}
      data={content}
      keyExtractor={(item, index) =>
        String(item._id || item.id || index)
      }
      ListHeaderComponent={
        <>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>{"< Back"}</Text>
          </TouchableOpacity>
          <Text style={styles.kicker}>
            Creator
          </Text>
          <Text style={styles.name}>
            {creator?.displayName ||
              "Creator Profile"}
          </Text>
          {!!creator?.bio && (
            <Text style={styles.bio}>
              {creator.bio}
            </Text>
          )}
          <Text style={styles.meta}>
            {typeof creator?.followers ===
            "number"
              ? `${creator.followers} followers`
              : "Follow updates from this creator."}
          </Text>
          {!!error && !creator && (
            <TouchableOpacity
              style={styles.errorCard}
              onPress={load}
            >
              <Text style={styles.error}>
                {error}
              </Text>
              <Text style={styles.retry}>
                Tap to retry
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.button,
              (!creatorId || busy) &&
                styles.disabled,
            ]}
            disabled={!creatorId || busy}
            onPress={handleFollow}
          >
            <Text style={styles.text}>
              {busy
                ? "Saving..."
                : following
                  ? "Following — Unfollow"
                  : "Follow"}
            </Text>
          </TouchableOpacity>
          <Text style={styles.sectionTitle}>
            Latest from this creator
          </Text>
        </>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>
          No published titles from this creator yet. Discover more on Home.
        </Text>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.78}
          onPress={() =>
            router.push({
              pathname: "/details" as any,
              params: {
                id: String(item._id || item.id),
              },
            })
          }
        >
          <Text
            style={styles.cardTitle}
            numberOfLines={2}
          >
            {item.title || "Untitled"}
          </Text>
          <Text style={styles.cardMeta}>
            {[item.type, item.releaseYear]
              .filter(Boolean)
              .join(" • ") || "Title"}
          </Text>
        </TouchableOpacity>
      )}
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
  },

  backBtn: {
    alignSelf: "flex-start",
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: AppTheme.radius.sm,
    backgroundColor: AppTheme.colors.surfaceSoft,
    marginBottom: 12,
  },

  backText: {
    color: AppTheme.colors.text,
    fontWeight: "800",
  },

  kicker: {
    color: AppTheme.colors.accent,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 8,
  },

  name: {
    color: AppTheme.colors.text,
    fontSize: 28,
    fontWeight: "900",
  },

  bio: {
    color: AppTheme.colors.textMuted,
    marginTop: 8,
    lineHeight: 20,
  },

  meta: {
    color: AppTheme.colors.textSubtle,
    marginTop: 6,
    marginBottom: 16,
  },

  sectionTitle: {
    color: AppTheme.colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 24,
    marginBottom: 12,
  },

  button: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppTheme.colors.accent,
    borderRadius: AppTheme.radius.md,
  },

  disabled: {
    opacity: 0.5,
  },

  text: {
    color: AppTheme.colors.background,
    fontWeight: "900",
  },

  card: {
    backgroundColor: AppTheme.colors.surface,
    borderColor: AppTheme.colors.border,
    borderWidth: 1,
    borderRadius: AppTheme.radius.md,
    padding: 16,
    marginBottom: 10,
  },

  cardTitle: {
    color: AppTheme.colors.text,
    fontWeight: "800",
    lineHeight: 20,
  },

  cardMeta: {
    color: AppTheme.colors.textMuted,
    marginTop: 6,
    fontSize: 12,
  },

  empty: {
    color: AppTheme.colors.textMuted,
    textAlign: "center",
    marginTop: 24,
    lineHeight: 21,
  },

  errorCard: {
    backgroundColor: "rgba(225,91,100,0.12)",
    borderColor: AppTheme.colors.danger,
    borderWidth: 1,
    borderRadius: AppTheme.radius.md,
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
});
