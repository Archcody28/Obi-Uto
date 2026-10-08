import React, {
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  ImageBackground,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  useLocalSearchParams,
  router,
} from "expo-router";

import {
  getMediaDetails,
  getEpisodes,
} from "../api/mediaApi";
import {
  getSimilar,
} from "../api/recommendationApi";
import {
  toggleLike,
  getComments,
  addComment,
} from "../api/engagementApi";
import {
  getFavorites,
  addFavorite as addFavoriteApi,
  removeFavorite as removeFavoriteApi,
} from "../api/favoriteApi";
import MediaRow from "../components/MediaRow";
import {
  useFavoritesStore,
} from "../store/favoritesStore";
import {
  usePlayerStore,
} from "../store/playerStore";
import {
  useProfileStore,
} from "../store/profileStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppTheme } from "../constants/theme";

export default function DetailsScreen() {
  const insets = useSafeAreaInsets();
  const params =
    useLocalSearchParams();

  const id =
    Array.isArray(params.id)
      ? params.id[0]
      : params.id;

  const [
    media,
    setMedia,
  ] = useState<any>(null);
  const [
    similar,
    setSimilar,
  ] = useState<any[]>([]);
  const [
    episodes,
    setEpisodes,
  ] = useState<any[]>([]);
  const [
    comments,
    setComments,
  ] = useState<any[]>([]);
  const [
    commentText,
    setCommentText,
  ] = useState("");
  const [
    liked,
    setLiked,
  ] = useState(false);
  const [
    favoriteBusy,
    setFavoriteBusy,
  ] = useState(false);
  const [
    commentBusy,
    setCommentBusy,
  ] = useState(false);
  const [
    loading,
    setLoading,
  ] = useState(true);
  const [
    error,
    setError,
  ] = useState("");

  const setQueue =
    usePlayerStore(
      (state) =>
        state.setQueue
    );
  const storeAddFavorite =
    useFavoritesStore(
      (state) =>
        state.addFavorite
    );
  const removeFavorite =
    useFavoritesStore(
      (state) =>
        state.removeFavorite
    );

  const loadMedia =
    async () => {
      if (!id) {
        setError(
          "This title could not be opened."
        );
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const data =
          await getMediaDetails(id);

        setMedia(data);

        // Sync the Favorite button with the server: Details previously
        // always showed "Favorite" even for saved titles, and tapping it
        // re-posted without ever offering Remove.
        try {
          const favorites = await getFavorites();
          const list = Array.isArray(favorites)
            ? favorites
            : favorites?.favorites || favorites?.data || [];

          setLiked(
            list.some(
              (entry: any) =>
                (entry?.media?._id || entry?.media || entry?._id) ===
                (data?._id || id)
            )
          );
        } catch (favErr) {
          console.log(favErr);
        }

        if (
          data.type === "series"
        ) {
          const eps =
            await getEpisodes(
              data._id
            );
          setEpisodes(eps);
        } else {
          setEpisodes([]);
        }

        const [
          loadedComments,
          similarData,
        ] = await Promise.all([
          getComments(data._id),
          getSimilar(data._id),
        ]);

        setComments(
          loadedComments || []
        );
        setSimilar(
          similarData || []
        );
      } catch (err: any) {
        console.log(err);
        setError(
          err?.response?.data
            ?.message ||
            "We could not load this title."
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadMedia();
  }, [id]);

  const playItem = (
    item: any
  ) => {
    setQueue(
      [
        {
          mediaId: item._id,
          title:
            item.seriesInfo
              ?.episodeTitle ||
            item.title,
          videoUrl:
            item.videoUrl,
        },
      ],
      0
    );

    router.push({
      pathname: "/player",
      params: {
        mediaId: item._id,
        videoUrl:
          item.videoUrl,
        title:
          item.seriesInfo
            ?.episodeTitle ||
          item.title,
      },
    });
  };

  const handleFavorite = async () => {
    if (favoriteBusy || !media?._id) return;
    const previous = liked;
    setFavoriteBusy(true);
    setLiked(!previous);
    try {
      const profile = useProfileStore.getState().activeProfile;
      if (previous) {
        await removeFavoriteApi(media._id);
        removeFavorite(media._id);
      } else {
        // Favorites and likes are separate backends: /favorites persists the
        // library entry, /engagement/like only toggles the like counter.
        await addFavoriteApi(media._id);
        await toggleLike(media._id).catch(() => null);
        storeAddFavorite({ id: media._id, _id: media._id, title: media.title, profileId: profile?.id });
      }
    } catch (err) {
      console.log(err);
      setLiked(previous);
      Alert.alert("Favorite failed", "Please try again.");
    } finally {
      setFavoriteBusy(false);
    }
  };

  const handleComment =
    async () => {
      if (commentBusy) {
        return;
      }

      try {
        if (
          !commentText.trim()
        ) {
          return;
        }

        const text = commentText.trim();
        setCommentBusy(true);
        setCommentText("");
        let posted = null;
        try {
          posted = await addComment(media._id, text);
        } catch (postErr) {
          setCommentText(text);
          throw postErr;
        }
        const fresh = await getComments(media._id);
        setComments(fresh || (posted ? [posted] : []));
      } catch (err) {
        console.log(err);
        Alert.alert(
          "Comment failed",
          "Your text was kept — please try again."
        );
      } finally {
        setCommentBusy(false);
      }
    };

  const creatorId =
    typeof media?.creatorId === "object"
      ? media?.creatorId?._id
      : media?.creatorId || media?.creator;

  if (loading) {
    return (
      <View style={styles.state}>
        <ActivityIndicator
          color={
            AppTheme.colors.accent
          }
        />
        <Text style={styles.stateText}>
          Loading title...
        </Text>
      </View>
    );
  }

  if (error || !media) {
    return (
      <View style={styles.state}>
        <Text style={styles.stateTitle}>
          Title unavailable
        </Text>
        <Text style={styles.stateText}>
          {error}
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={loadMedia}
        >
          <Text
            style={styles.primaryText}
          >
            Retry
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const imageUri =
    media.banner ||
    media.thumbnail;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top,
          paddingBottom: 90 + insets.bottom,
        },
      ]}
      data={comments}
      keyExtractor={(item, index) =>
        item._id ||
        index.toString()
      }
      ListHeaderComponent={
        <>
          <ImageBackground
            source={
              imageUri
                ? {
                    uri: imageUri,
                  }
                : undefined
            }
            style={styles.hero}
            imageStyle={styles.heroImage}
          >
            <View style={styles.heroShade}>
              <Text style={styles.kicker}>
                {media.type || "Title"}
              </Text>
              <Text style={styles.title}>
                {media.title}
              </Text>
              <Text style={styles.meta}>
                {[
                  media.releaseYear,
                  Array.isArray(
                    media.genre
                  )
                    ? media.genre.join(
                        ", "
                      )
                    : media.genre,
                  media.maturityRating,
                ]
                  .filter(Boolean)
                  .join(" • ")}
              </Text>
            </View>
          </ImageBackground>

          <Text style={styles.description}>
            {media.description ||
              "No description available."}
          </Text>

          {!!creatorId && (
            <TouchableOpacity
              style={styles.creatorButton}
              onPress={() =>
                router.push({
                  pathname: "/creator-profile" as any,
                  params: {
                    creatorId: String(creatorId),
                  },
                })
              }
            >
              <Text style={styles.creatorText}>
                View Creator Profile
              </Text>
            </TouchableOpacity>
          )}

          {media.locked ||
          media.isPremium ? (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() =>
                Alert.alert(
                  "Premium content",
                  "Upgrade to Premium to watch this content."
                )
              }
            >
              <Text style={styles.secondaryText}>
                Premium Required
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() =>
                  playItem(media)
                }
              >
                <Text style={styles.primaryText}>
                  Play
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleFavorite}
                disabled={favoriteBusy}
              >
                <Text style={styles.secondaryText}>
                  {favoriteBusy
                    ? "Saving..."
                    : liked
                      ? "★ Favorited — Remove"
                      : "☆ Favorite"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {episodes.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Episodes
              </Text>
              {episodes.map((item) => (
                <TouchableOpacity
                  key={item._id}
                  style={styles.episode}
                  onPress={() =>
                    playItem(item)
                  }
                >
                  <Text
                    style={styles.episodeTitle}
                    numberOfLines={2}
                  >
                    S
                    {
                      item.seriesInfo
                        ?.seasonNumber
                    }
                    E
                    {
                      item.seriesInfo
                        ?.episodeNumber
                    }{" "}
                    {
                      item.seriesInfo
                        ?.episodeTitle ||
                      item.title
                    }
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Comments
            </Text>
            <View style={styles.commentBox}>
              <TextInput
                value={commentText}
                onChangeText={
                  setCommentText
                }
                placeholder="Add a comment..."
                placeholderTextColor={
                  AppTheme.colors.textSubtle
                }
                style={styles.input}
                editable={!commentBusy}
              />
              <TouchableOpacity
                style={[
                  styles.postButton,
                  commentBusy && styles.postDisabled,
                ]}
                onPress={handleComment}
                disabled={commentBusy}
              >
                <Text style={styles.postText}>
                  {commentBusy ? "Posting..." : "Post"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      }
      renderItem={({ item }) => (
        <View style={styles.comment}>
          <Text style={styles.commentName}>
            {item.userId?.name ||
              item.username ||
              "Viewer"}
          </Text>
          <Text style={styles.commentText}>
            {item.text ||
              item.message}
          </Text>
        </View>
      )}
      ListEmptyComponent={
        <Text style={styles.emptyText}>
          No comments yet.
        </Text>
      }
      ListFooterComponent={
        <MediaRow
          title="Because You Watched This"
          data={similar}
        />
      }
    />
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        AppTheme.colors.background,
    },

    content: {
      paddingBottom: 90,
    },

    hero: {
      minHeight: 420,
      justifyContent: "flex-end",
      backgroundColor:
        AppTheme.colors.surface,
    },

    heroImage: {
      opacity: 0.88,
    },

    heroShade: {
      padding: AppTheme.spacing.xl,
      paddingTop: 72,
      backgroundColor:
        "rgba(7,8,10,0.62)",
    },

    kicker: {
      color: AppTheme.colors.accent,
      fontSize: AppTheme.typography.kicker.fontSize,
      fontWeight: AppTheme.typography.kicker.fontWeight,
      letterSpacing: AppTheme.typography.kicker.letterSpacing,
      textTransform: "uppercase",
      marginBottom: AppTheme.spacing.md,
    },

    title: {
      color: AppTheme.colors.text,
      fontSize: AppTheme.typography.display.fontSize,
      fontWeight: AppTheme.typography.display.fontWeight,
      lineHeight: AppTheme.typography.display.lineHeight,
    },

    meta: {
      color:
        AppTheme.colors.textMuted,
      marginTop: 10,
      lineHeight: 20,
    },

    description: {
      color: AppTheme.colors.text,
      fontSize: AppTheme.typography.body.fontSize,
      lineHeight: AppTheme.typography.body.lineHeight,
      paddingHorizontal: AppTheme.spacing.lg,
      paddingTop: AppTheme.spacing.lg,
    },

    creatorButton: {
      minHeight: 44,
      alignSelf: "flex-start",
      alignItems: "center",
      justifyContent: "center",
      marginHorizontal: AppTheme.spacing.lg,
      marginTop: AppTheme.spacing.md,
      paddingHorizontal: 16,
      borderRadius: AppTheme.radius.md,
      backgroundColor: AppTheme.colors.surface,
      borderColor: AppTheme.colors.border,
      borderWidth: 1,
    },

    creatorText: {
      color: AppTheme.colors.accent,
      fontWeight: "800",
    },

    actions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: AppTheme.spacing.md,
      paddingHorizontal: AppTheme.spacing.lg,
      paddingTop: AppTheme.spacing.lg,
    },

    primaryButton: {
      minHeight: 48,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        AppTheme.colors.accent,
      paddingHorizontal: 20,
      borderRadius:
        AppTheme.radius.md,
    },

    primaryText: {
      color:
        AppTheme.colors.background,
      fontWeight: "900",
    },

    secondaryButton: {
      minHeight: 48,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        AppTheme.colors.surface,
      borderColor:
        AppTheme.colors.border,
      borderWidth: 1,
      paddingHorizontal: 18,
      borderRadius:
        AppTheme.radius.md,
    },

    secondaryText: {
      color: AppTheme.colors.text,
      fontWeight: "800",
    },

    section: {
      paddingHorizontal: AppTheme.spacing.lg,
      paddingTop: AppTheme.spacing.xxl,
    },

    sectionTitle: {
      color: AppTheme.colors.text,
      fontSize: AppTheme.typography.heading.fontSize,
      fontWeight: AppTheme.typography.heading.fontWeight,
      marginBottom: AppTheme.spacing.md,
    },

    episode: {
      padding: 15,
      borderRadius:
        AppTheme.radius.md,
      backgroundColor:
        AppTheme.colors.surface,
      borderColor:
        AppTheme.colors.border,
      borderWidth: 1,
      marginBottom: 10,
    },

    episodeTitle: {
      color: AppTheme.colors.text,
      fontWeight: "800",
      lineHeight: 20,
    },

    commentBox: {
      flexDirection: "row",
      gap: 10,
    },

    input: {
      flex: 1,
      minHeight: 48,
      backgroundColor:
        AppTheme.colors.input,
      color: AppTheme.colors.text,
      borderRadius:
        AppTheme.radius.md,
      borderWidth: 1,
      borderColor:
        AppTheme.colors.border,
      paddingHorizontal: AppTheme.spacing.lg,
    },

    postButton: {
      minHeight: 48,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 18,
      borderRadius:
        AppTheme.radius.md,
      backgroundColor:
        AppTheme.colors.surfaceSoft,
    },

    postDisabled: {
      opacity: 0.5,
    },

    postText: {
      color: AppTheme.colors.text,
      fontWeight: "900",
    },

    comment: {
      marginHorizontal: AppTheme.spacing.lg,
      marginTop: AppTheme.spacing.md,
      padding: AppTheme.spacing.lg,
      borderRadius:
        AppTheme.radius.md,
      backgroundColor:
        AppTheme.colors.surface,
      borderColor:
        AppTheme.colors.border,
      borderWidth: 1,
    },

    commentName: {
      color: AppTheme.colors.accent,
      fontWeight: "900",
      marginBottom: 4,
    },

    commentText: {
      color:
        AppTheme.colors.textMuted,
      lineHeight: 20,
    },

    emptyText: {
      color:
        AppTheme.colors.textSubtle,
      marginHorizontal: 20,
      marginTop: 12,
      marginBottom: 20,
    },

    state: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        AppTheme.colors.background,
      padding: 24,
    },

    stateTitle: {
      color: AppTheme.colors.text,
      fontSize: AppTheme.typography.title.fontSize,
      fontWeight: AppTheme.typography.title.fontWeight,
      marginBottom: AppTheme.spacing.md,
    },

    stateText: {
      color:
        AppTheme.colors.textMuted,
      textAlign: "center",
      marginTop: 10,
      marginBottom: 12,
    },
  });
