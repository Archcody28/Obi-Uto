import React, {
  useEffect,
  useState,
} from "react";

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  router,
  useLocalSearchParams,
} from "expo-router";

import {
  VideoView,
  useVideoPlayer,
} from "expo-video";

import {
  useWatchStore,
} from "../store/watchStore";

import {
  useFavoritesStore,
} from "../store/favoritesStore";

import {
  useDownloadStore,
} from "../store/downloadStore";

import {
  getEpisodes,
  getMediaDetails,
} from "../api/mediaApi";

import {
  usePlayerStore,
} from "../store/playerStore";

import {
  downloadVideo,
  cancelDownload,
  hasActiveDownload,
  isOfflineCompatible,
} from "../services/downloadService";

import {
  authorizeDownload,
  saveProgress as saveProgressApi,
  getProgress,
} from "../api/watchApi";

import {
  addFavorite as addFavoriteApi,
} from "../api/favoriteApi";

import {
  useProfileStore,
} from "../store/profileStore";
import { useSyncStore } from "@/store/syncStore";
import LiveChatScreen from "./LivechatScreen";
import { AppTheme } from "../constants/theme";

export default function PlayerScreen() {
  const insets = useSafeAreaInsets();
  const params =
    useLocalSearchParams();

  const onlineVideoUrl =
    Array.isArray(
      params.videoUrl
    )
      ? params.videoUrl[0]
      : params.videoUrl;

  const localUri =
    Array.isArray(
      params.localUri
    )
      ? params.localUri[0]
      : params.localUri;

  const videoSource =
    localUri ||
    onlineVideoUrl;

  const mediaId =
    Array.isArray(
      params.mediaId
    )
      ? params.mediaId[0]
      : params.mediaId;

  const title =
    Array.isArray(
      params.title
    )
      ? params.title[0]
      : params.title;

  const isLive =
    Array.isArray(
      params.isLive
    )
      ? params.isLive[0] ===
        "true"
      : params.isLive ===
        "true";

  const streamId =
    Array.isArray(
      params.streamId
    )
      ? params.streamId[0]
      : params.streamId ||
        mediaId;

  const creatorId =
    Array.isArray(
      params.creatorId
    )
      ? params.creatorId[0]
      : params.creatorId;

  const setCurrentMedia =
    usePlayerStore(
      (state) =>
        state.setCurrentMedia
    );

  const saveLocalProgress =
    useWatchStore(
      (state) =>
        state.saveProgress
    );

  const addFavorite =
    useFavoritesStore(
      (state) =>
        state.addFavorite
    );

  const addDownload =
    useDownloadStore(
      (state) =>
        state.addDownload
    );

  const updateDownload =
    useDownloadStore(
      (state) =>
        state.updateDownload
    );

  const downloadEntry =
    useDownloadStore(
      (state) =>
        mediaId
          ? state.downloads.find(
              (item) => item.id === mediaId
            )
          : undefined
    );

  const playMedia =
    usePlayerStore(
      (state) =>
        state.playMedia
    );

  const [
    progress,
    setProgress,
  ] = useState(0);

  const [
    nextEpisode,
    setNextEpisode,
  ] = useState<any>(
    null
  );

  const [
    downloadArt,
    setDownloadArt,
  ] = useState<any>(
    null
  );

  const [
    countdown,
    setCountdown,
  ] = useState(5);

  const player =
    useVideoPlayer(
      videoSource || "",
      (player) => {
        player.play();
      }
    );

  /**
   * Load saved progress
   */
  useEffect(() => {
    if (!mediaId) {
      return;
    }

    getProgress(mediaId)
      .then((data) => {
        if (
          data?.currentTime
        ) {
          setProgress(
            data.currentTime
          );
        }
      })
      .catch(
        console.error
      );
  }, [mediaId]);

  /**
   * Load artwork for the download record (thumbnail/banner).
   */
  useEffect(() => {
    if (!mediaId) {
      return;
    }

    let alive = true;

    getMediaDetails(mediaId)
      .then((data) => {
        if (alive && data) {
          setDownloadArt(data?.media || data);
        }
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, [mediaId]);

  /**
   * Set current media
   */
  useEffect(() => {
    if (!mediaId) {
      return;
    }

    setCurrentMedia({
      mediaId,
      title,
      videoUrl:
        onlineVideoUrl,
    });
  }, [
    mediaId,
    title,
    onlineVideoUrl,
    setCurrentMedia,
  ]);

  /**
   * Resume playback
   */
  useEffect(() => {
    if (
      progress > 0
    ) {
      player.currentTime =
        progress;
    }
  }, [
    progress,
    player,
  ]);

  /**
   * Save progress periodically
   */
  useEffect(() => {
    const interval =
      setInterval(() => {
        if (
          !mediaId
        ) {
          return;
        }

        saveProgressApi({
          mediaId,
          currentTime:
            player.currentTime,
          duration:
            player.duration ||
            0,
        }).catch(
          console.error
        );
      }, 10000);

    return () => {
      clearInterval(
        interval
      );

      if (
        !mediaId
      ) {
        return;
      }

      saveProgressApi({
        mediaId,
        currentTime:
          player.currentTime,
        duration:
          player.duration ||
          0,
      }).catch(
        console.error
      );
    };
  }, [
    mediaId,
    player,
  ]);

  /**
   * Load next episode
   */
  const loadNextEpisode =
    async () => {
      try {
        if (!mediaId) {
          return;
        }

        const media =
          await getMediaDetails(
            mediaId
          );

        if (
          !media?.seriesInfo
        ) {
          return;
        }

        const episodes =
          await getEpisodes(
            media
              .seriesInfo
              .seriesId
          );

        const currentIndex =
          episodes.findIndex(
            (
              episode: any
            ) =>
              episode._id ===
              media._id
          );

        if (
          currentIndex ===
          -1
        ) {
          return;
        }

        const next =
          episodes[
            currentIndex +
              1
          ];

        setNextEpisode(
          next || null
        );
      } catch (err) {
        console.log(
          err
        );
      }
    };

  useEffect(() => {
    loadNextEpisode();
  }, [mediaId]);

  /**
   * Auto-play next episode
   */
  useEffect(() => {
    if (
      !nextEpisode
    ) {
      return;
    }

    const interval =
      setInterval(() => {
        const duration =
          player.duration ||
          0;

        const currentTime =
          player.currentTime ||
          0;

        const remaining =
          duration -
          currentTime;

        if (
          remaining <=
            5 &&
          remaining > 0
        ) {
          setCountdown(
            Math.ceil(
              remaining
            )
          );
        }

        if (
          remaining <=
          0
        ) {
          clearInterval(
            interval
          );

          playMedia({
            mediaId:
              nextEpisode._id,
            title:
              nextEpisode
                .seriesInfo
                ?.episodeTitle ||
              nextEpisode.title,
            videoUrl:
              nextEpisode.videoUrl,
          });

          router.replace({
            pathname:
              "/player",

            params: {
              mediaId:
                nextEpisode._id,

              title:
                nextEpisode
                  .seriesInfo
                  ?.episodeTitle ||
                nextEpisode.title,

              videoUrl:
                nextEpisode.videoUrl,
            },
          });
        }
      }, 1000);

    return () =>
      clearInterval(
        interval
      );
  }, [
    nextEpisode,
    player,
    playMedia,
  ]);

  const handleDownload =
    async () => {
      try {
        if (
          !mediaId
        ) {
          Alert.alert(
            "Error",
            "Media ID missing"
          );

          return;
        }

        if (!onlineVideoUrl) {
          await addDownload({
            id: mediaId,
            mediaId,
            title: title || "Untitled",
            thumbnail:
              downloadArt?.thumbnail || null,
            banner: downloadArt?.banner || null,
            videoUrl: null,
            uri: null,
            status: "failed",
            progress: 0,
            error: "No playable file for this title yet",
          });

          Alert.alert(
            "Error",
            "No playable file for this title yet"
          );

          return;
        }

        if (!isOfflineCompatible(onlineVideoUrl)) {
          await addDownload({
            id: mediaId,
            mediaId,
            title: title || "Untitled",
            thumbnail:
              downloadArt?.thumbnail || null,
            banner: downloadArt?.banner || null,
            videoUrl: onlineVideoUrl,
            uri: null,
            status: "failed",
            progress: 0,
            error:
              "This title uses a streaming format that cannot be saved offline yet. An MP4 file is required.",
          });

          Alert.alert(
            "Not downloadable",
            "This title uses a streaming format that cannot be saved offline yet."
          );

          return;
        }

        const auth = await authorizeDownload(
          mediaId
        );

        if (auth && auth.allowed === false) {
          await addDownload({
            id: mediaId,
            mediaId,
            title: title || "Untitled",
            thumbnail:
              downloadArt?.thumbnail || null,
            banner: downloadArt?.banner || null,
            videoUrl: onlineVideoUrl,
            uri: null,
            status: "failed",
            progress: 0,
            error: auth.message || "Download not allowed",
          });

          Alert.alert(
            "Not allowed",
            auth.message || "Download not allowed"
          );

          return;
        }

        // Active download -> refresh guard; duplicate taps are ignored.
        if (
          downloadEntry?.status === "downloading" ||
          hasActiveDownload(mediaId)
        ) {
          return;
        }

        // Immediately show downloading state before the file work starts.
        await addDownload({
          id: mediaId,
          mediaId,
          title: title || "Untitled",
          thumbnail:
            downloadArt?.thumbnail || null,
          banner: downloadArt?.banner || null,
          videoUrl: onlineVideoUrl,
          uri: null,
          status: "downloading",
          progress: 0,
          error: null,
        });

        const result =
          await downloadVideo(
            onlineVideoUrl,
            `${mediaId}.mp4`,
            (p) => {
              updateDownload(mediaId, {
                progress: p,
              });
            },
            mediaId
          );

        await updateDownload(mediaId, {
          status: "completed",
          progress: 1,
          uri: result.uri,
          error: null,
        });

        Alert.alert(
          "Download Complete",
          `${title || "Video"} downloaded successfully!`
        );
      } catch (err: any) {
        console.log(
          err
        );

        const message =
          err?.response?.data?.message ||
          err?.message ||
          "Unable to download";

        // Cancellation surfaces as a cancelled state, not a failure.
        if (/cancel/i.test(message) && mediaId) {
          await updateDownload(mediaId, {
            status: "cancelled",
            progress: 0,
            error: null,
          });

          return;
        }

        if (mediaId) {
          await updateDownload(mediaId, {
            status: "failed",
            error: message,
          });
        }

        Alert.alert(
          "Download Failed",
          message
        );
      }
    };

  const handleSave =
    async () => {
      try {
        saveLocalProgress({
          id: mediaId,
          title,
          progress:
            player.currentTime,
        });

        const payload = {
          mediaId,
          currentTime:
            player.currentTime,
          duration:
            player.duration ||
            0,
        };

      try{
        await saveProgressApi(
          payload
        );} catch {
          useSyncStore
          .getState()
          .addTask({
            id:
             Date.now()
             .toString(),
             type: "save-progress",
             payload,
          });
        }

        Alert.alert(
          "Success",
          "Progress Saved"
        );
      } catch (err) {
        console.log(
          err
        );
      }
    };

  const handleFavorite =
    async () => {
      try {
        const profile =
  useProfileStore
    .getState()
    .activeProfile;

addFavorite({
  id: mediaId,
  title,
  profileId:
    profile?.id,
});

        await addFavoriteApi(
          mediaId
        );

        Alert.alert(
          "Success",
          "Saved To Favorites"
        );
      } catch (err) {
        console.log(
          err
        );
      }
    };

  if (!videoSource) {
    return (
      <View
        style={
          styles.container
        }
      >
        <Text
          style={
            styles.errorText
          }
        >
          Video not found
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top,
          paddingBottom: 96 + insets.bottom,
        },
      ]}
    >
    <VideoView
        style={
          isLive
            ? styles.liveVideo
            : styles.video
        }
        player={player}
      />

      {isLive && streamId && (
        <View style={styles.chatPanel}>
          <LiveChatScreen
            streamId={streamId}
            stream={{
              _id: streamId,
              creatorId,
            }}
          />
        </View>
      )}

      {!isLive &&
        nextEpisode &&
        countdown <=
          5 &&
        countdown >
          0 && (
          <View
            style={
              styles.nextContainer
            }
          >
            <Text
              style={
                styles.nextText
              }
            >
              Next Episode:
            </Text>

            <Text
              style={
                styles.nextTitle
              }
            >
              {nextEpisode
                .seriesInfo
                ?.episodeTitle ||
                nextEpisode.title}
            </Text>

            <Text
              style={
                styles.nextText
              }
            >
              Starts in{" "}
              {
                countdown
              }
              s
            </Text>

            <TouchableOpacity
              style={
                styles.cancelBtn
              }
              onPress={() => {
                setNextEpisode(
                  null
                );

                setCountdown(
                  5
                );
              }}
            >
              <Text
                style={
                  styles.downloadText
                }
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        )}

      {!isLive && !localUri && (
        <View>
          <TouchableOpacity
            style={[
              styles.downloadBtn,
              downloadEntry?.status === "downloading" &&
                styles.downloadBtnActive,
              downloadEntry?.status === "completed" &&
                styles.downloadBtnDone,
            ]}
            onPress={handleDownload}
          >
            <Text
              style={
                styles.downloadText
              }
            >
              {downloadEntry?.status === "downloading"
                ? `Downloading ${Math.round((downloadEntry?.progress || 0) * 100)}% — Tap to Cancel`
                : downloadEntry?.status === "completed"
                  ? "Downloaded — View Downloads"
                  : downloadEntry?.status === "failed"
                    ? "Retry Download"
                    : downloadEntry?.status === "cancelled"
                      ? "Download Cancelled — Retry"
                      : "Download"}
            </Text>
          </TouchableOpacity>

          {downloadEntry?.status === "downloading" && (
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.round((downloadEntry?.progress || 0) * 100)}%`,
                  },
                ]}
              />
            </View>
          )}

          {!!downloadEntry?.error &&
            downloadEntry?.status === "failed" && (
              <Text style={styles.downloadError}>
                {downloadEntry.error}
              </Text>
            )}
        </View>
      )}

      <TouchableOpacity
        style={
          styles.downloadBtn
        }
        onPress={
          handleSave
        }
      >
        <Text
          style={
            styles.downloadText
          }
        >
          Save Progress
        </Text>
      </TouchableOpacity>

      {!isLive && (
      <TouchableOpacity
        style={
          styles.favoriteBtn
        }
        onPress={
          handleFavorite
        }
      >
        <Text
          style={
            styles.downloadText
          }
        >
          ❤ Favorite
        </Text>
      </TouchableOpacity>
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

    content: {
      flexGrow: 1,
      paddingBottom: 96,
    },

    video: {
      aspectRatio: 16 / 9,
      minHeight: 220,
      backgroundColor: "#000000",
    },

    liveVideo: {
      height: 280,
      backgroundColor: "#000000",
    },

    chatPanel: {
      flex: 1,
      borderTopColor: AppTheme.colors.border,
      borderTopWidth: 1,
    },

    errorText: {
      color: AppTheme.colors.textMuted,
      textAlign: "center",
      marginTop: 60,
      fontSize: AppTheme.typography.heading.fontSize,
    },

    downloadBtn: {
      backgroundColor: AppTheme.colors.accent,
      padding: AppTheme.spacing.lg,
      marginTop: AppTheme.spacing.md,
      marginHorizontal: AppTheme.spacing.lg,
      borderRadius: AppTheme.radius.md,
    },

    downloadBtnActive: {
      backgroundColor: AppTheme.colors.accentMuted,
    },

    downloadBtnDone: {
      backgroundColor: AppTheme.colors.success,
    },

    progressTrack: {
      height: 6,
      marginTop: AppTheme.spacing.sm,
      marginHorizontal: AppTheme.spacing.lg,
      borderRadius: 3,
      backgroundColor: "rgba(248,244,234,0.18)",
      overflow: "hidden",
    },

    progressFill: {
      height: "100%",
      backgroundColor: AppTheme.colors.accent,
    },

    downloadError: {
      color: AppTheme.colors.danger,
      marginTop: AppTheme.spacing.sm,
      marginHorizontal: AppTheme.spacing.lg,
      fontSize: AppTheme.typography.caption.fontSize,
      lineHeight: 16,
    },

    favoriteBtn: {
      backgroundColor: AppTheme.colors.surface,
      borderWidth: 1,
      borderColor: AppTheme.colors.borderSoft,
      padding: AppTheme.spacing.lg,
      marginTop: AppTheme.spacing.md,
      marginHorizontal: AppTheme.spacing.lg,
      borderRadius: AppTheme.radius.md,
    },

    downloadText: {
      color: AppTheme.colors.text,
      textAlign: "center",
      fontWeight: "900",
    },

    nextContainer: {
      backgroundColor: AppTheme.colors.surface,
      margin: AppTheme.spacing.lg,
      padding: AppTheme.spacing.lg,
      borderRadius: AppTheme.radius.lg,
      borderWidth: 1,
      borderColor: AppTheme.colors.borderSoft,
    },

    nextText: {
      color: AppTheme.colors.textSubtle,
      textAlign: "center",
      fontSize: AppTheme.typography.caption.fontSize,
      fontWeight: AppTheme.typography.caption.fontWeight,
    },

    nextTitle: {
      color: AppTheme.colors.text,
      fontWeight: "900",
      textAlign: "center",
      marginVertical: AppTheme.spacing.md,
    },

    cancelBtn: {
      marginTop: AppTheme.spacing.md,
      padding: AppTheme.spacing.md,
      borderRadius: AppTheme.radius.md,
      backgroundColor: "rgba(225,91,100,0.16)",
      borderWidth: 1,
      borderColor: AppTheme.colors.danger,
    },
  });
