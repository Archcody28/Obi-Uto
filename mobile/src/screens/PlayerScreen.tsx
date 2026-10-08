import React, {
  useEffect,
  useRef,
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

  const [progress, setProgress] =
    useState(0);

  /** Live values read safely outside the expo-video player instance. */
  const progressRef = useRef(0);
  const durationRef = useRef(0);
  const mountedRef = useRef(true);
  const lastSavedRef = useRef(0);

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
      videoSource || null,
      (player) => {
        player.loop = false;
        player.play();
      }
    );

  /**
   * Track mount state so async callbacks never touch a released player.
   */
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * Load saved progress
   */
  useEffect(() => {
    if (!mediaId) {
      return;
    }

    let alive = true;

    getProgress(mediaId)
      .then((data) => {
        if (!alive || !mountedRef.current) {
          return;
        }

        if (data?.currentTime) {
          setProgress(data.currentTime);
        }
      })
      .catch(console.error);

    return () => {
      alive = false;
    };
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
   * Resume playback (seek once per title, never touch a released player).
   */
  const didSeekRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      !mediaId ||
      isLive ||
      !(progress > 0) ||
      !Number.isFinite(progress) ||
      didSeekRef.current === mediaId
    ) {
      return;
    }

    let duration = 0;
    try {
      duration = player?.duration || 0;
    } catch {
      return;
    }

    if (!Number.isFinite(duration) || duration <= 0) {
      return;
    }

    if (progress >= duration - 2) {
      didSeekRef.current = mediaId;
      return;
    }

    try {
      player.currentTime = Math.min(progress, duration);
      didSeekRef.current = mediaId;
    } catch (err) {
      console.log("Seek error:", err);
    }
  }, [progress, player, mediaId, isLive]);

  useEffect(() => {
    didSeekRef.current = null;
    progressRef.current = 0;
    durationRef.current = 0;
    lastSavedRef.current = 0;
  }, [mediaId]);

  /**
   * Save progress periodically (throttled, completion-aware).
   */
  useEffect(() => {
    const readTime = () => {
      if (!mountedRef.current || !player) {
        return { currentTime: 0, duration: 0 };
      }
      try {
        const t = player.currentTime;
        const d = player.duration || 0;

        return {
          currentTime: Number.isFinite(t) ? t : 0,
          duration: Number.isFinite(d) ? d : 0,
        };
      } catch {
        return { currentTime: 0, duration: 0 };
      }
    };

    const shouldSave = (currentTime: number, duration: number) => {
      if (!mediaId || isLive || currentTime <= 0) {
        return false;
      }
      // Completed (>=95%): save once, then stop spamming.
      if (duration > 0 && currentTime >= duration * 0.95) {
        return lastSavedRef.current < duration * 0.95;
      }
      return Math.abs(currentTime - lastSavedRef.current) >= 5;
    };

    const persist = (currentTime: number, duration: number) => {
      lastSavedRef.current = currentTime;
      progressRef.current = currentTime;
      durationRef.current = duration;
      saveLocalProgress({
        id: mediaId,
        title,
        progress: currentTime,
      });
      saveProgressApi({ mediaId, currentTime, duration }).catch(console.error);
    };

    const interval = setInterval(() => {
      const { currentTime, duration } = readTime();

      if (!shouldSave(currentTime, duration)) {
        return;
      }

      persist(currentTime, duration);
    }, 10000);

    return () => {
      clearInterval(interval);

      if (!mountedRef.current) {
        return;
      }

      const { currentTime, duration } = readTime();

      if (!shouldSave(currentTime, duration)) {
        return;
      }

      persist(currentTime, duration);
    };
  }, [mediaId, player, isLive, title, saveLocalProgress]);

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
   * Auto-play next episode (never touches a released player).
   */
  useEffect(() => {
    if (!nextEpisode) {
      return;
    }

    const interval = setInterval(() => {
      if (!mountedRef.current) {
        return;
      }

      let duration = 0;
      let currentTime = 0;
      try {
        duration = player?.duration || 0;
        currentTime = player?.currentTime || 0;
      } catch {
        return;
      }

      if (!Number.isFinite(duration) || duration <= 0) {
        return;
      }

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

  const handleSave = async () => {
    try {
      if (!mediaId) {
        Alert.alert("Error", "Media ID missing");
        return;
      }

      let currentTime = progressRef.current || 0;
      let duration = durationRef.current || 0;
      try {
        if (mountedRef.current && player) {
          const t = player.currentTime;
          const d = player.duration || 0;
          if (Number.isFinite(t) && t > 0) currentTime = t;
          if (Number.isFinite(d) && d > 0) duration = d;
        }
      } catch {
        // Keep last known ref values when the native player is released.
      }

      if (!(currentTime > 0)) {
        Alert.alert("Nothing to save", "Start playback first.");
        return;
      }

      lastSavedRef.current = currentTime;
      saveLocalProgress({ id: mediaId, title, progress: currentTime });

      const payload = { mediaId, currentTime, duration };

      try {
        await saveProgressApi(payload);
      } catch {
        useSyncStore.getState().addTask({
          id: Date.now().toString(),
          type: "save-progress",
          payload,
        });
      }

      Alert.alert("Success", "Progress Saved");
    } catch (err) {
      console.log(err);
    }
  };

  const handleFavorite = async () => {
    try {
      if (!mediaId) {
        Alert.alert("Error", "Media ID missing");
        return;
      }

      const profile = useProfileStore.getState().activeProfile;

      await addFavoriteApi(mediaId);

      addFavorite({ id: mediaId, _id: mediaId, title, profileId: profile?.id });

      Alert.alert("Success", "Saved To Favorites");
    } catch (err: any) {
      console.log(err);
      Alert.alert(
        "Favorite failed",
        err?.response?.data?.message || "Please try again."
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
        nativeControls
        contentFit="contain"
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
