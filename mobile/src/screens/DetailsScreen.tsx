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
  addFavorite as addFavoriteApi,
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
import { AppTheme } from "../constants/theme";

export default function DetailsScreen() {
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
  const addFavorite =
    useFavoritesStore(
      (state) =>
        state.addFavorite
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

  const handleFavorite =
    async () => {
      try {
        const profile =
          useProfileStore
            .getState()
            .activeProfile;

        addFavorite({
          id: media._id,
          title: media.title,
          profileId:
            profile?.id,
        });

        await addFavoriteApi(
          media._id
        );

        Alert.alert(
          "Saved",
          "Added to Favorites"
        );
      } catch (err) {
        console.log(err);
        Alert.alert(
          "Favorite failed",
          "Please try again."
        );
      }
    };

  const handleLike =
    async () => {
      try {
        const result =
          await toggleLike(
            media._id
          );

        setLiked(
          result.liked
        );
      } catch (err) {
        console.log(err);
      }
    };

  const handleComment =
    async () => {
      try {
        if (
          !commentText.trim()
        ) {
          return;
        }

        await addComment(
          media._id,
          commentText.trim()
        );

        setCommentText("");

        const updated =
          await getComments(
            media._id
          );

        setComments(updated);
      } catch (err) {
        console.log(err);
        Alert.alert(
          "Comment failed",
          "Please try again."
        );
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
      contentContainerStyle={
        styles.content
      }
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
              >
                <Text style={styles.secondaryText}>
                  Favorite
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleLike}
              >
                <Text style={styles.secondaryText}>
                  {liked
                    ? "Liked"
                    : "Like"}
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
              />
              <TouchableOpacity
                style={styles.postButton}
                onPress={handleComment}
              >
                <Text style={styles.postText}>
                  Post
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
      paddingTop: 120,
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
