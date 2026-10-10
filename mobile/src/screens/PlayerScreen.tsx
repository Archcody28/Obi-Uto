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
  isExternalMedia as checkExternal,
} from "../api/mediaApi";

import {
  usePlayerStore,
} from "../store/playerStore";

import {
  startDownload,
  cancelDownload,
  hasActiveDownload,
} from "../services/downloadService";

import {
  verifyLocalFile,
} from "../services/localMediaFile";

import {
  saveProgress as saveProgressApi,
  getProgress,
} from "../api/watchApi";

import {
  getStream as getLiveStreamApi,
} from "../api/liveStreamApi";

import {
  followCreator,
  unfollowCreator,
  getFollowStatus,
} from "../api/followApi";

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

  // Explicit downloadable single-file representation from the API contract
  // (see Media.downloadUrl); falls back to fetched media details below.
  const downloadUrlParam = Array.isArray(params.downloadUrl)
    ? params.downloadUrl[0]
    : params.downloadUrl;

  const localUri =
    Array.isArray(
      params.localUri
    )
      ? params.localUri[0]
      : params.localUri;

  const mediaId =
    Array.isArray(
      params.mediaId
    )
      ? params.mediaId[0]
      : params.mediaId;

  /**
   * Offline-first source: when a completed download for THIS media already
   * exists on disk, start playback from the local file — no network needed
   * to start. The pin is computed once per mediaId so a download completing
   * mid-playback never restarts the video; re-entering the player picks the
   * file up. A pin whose file has vanished is cleared (recovered below).
   */
  const offlinePinRef = useRef<{ id: string | null; uri: string | null }>({
    id: null,
    uri: null,
  });

  if (offlinePinRef.current.id !== (mediaId || null)) {
    const stored = mediaId
      ? useDownloadStore
          .getState()
          .downloads.find(
            (item: any) =>
              item.id === mediaId && item.status === "completed"
          )
      : undefined;

    offlinePinRef.current = {
      id: mediaId || null,
      uri: stored?.uri || null,
    };
  }

  const videoSource =
    localUri ||
    offlinePinRef.current.uri ||
    onlineVideoUrl;

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

  /*
   * Phase 29 — live stream awareness.
   * While watching live, poll the canonical stream endpoint for real status
   * (waiting/live/ended), viewer count and creator identity. When the
   * broadcast ends server-side we show an honest "ended" state instead of a
   * forever-buffering player.
   */
  const [liveInfo, setLiveInfo] = useState<any>(null);
  const [liveEnded, setLiveEnded] = useState(false);
  const [liveWaiting, setLiveWaiting] = useState(false);
  const [following, setFollowing] = useState<boolean | null>(null);
  const [followBusy, setFollowBusy] = useState(false);

  useEffect(() => {
    if (!isLive || !streamId) {
      return;
    }

    let alive = true;

    const refresh = async () => {
      try {
        const info = await getLiveStreamApi(streamId);
        if (!alive || !mountedRef.current) return;

        setLiveInfo(info);
        setLiveEnded(!info?.isLive && !!info?.endedAt);
        setLiveWaiting(!info?.isLive && !info?.endedAt);
      } catch (err) {
        // A live stream that 404s is treated as ended, not as a crash.
        if (alive && mountedRef.current) {
          setLiveEnded(true);
        }
      }
    };

    refresh();
    const timer = setInterval(refresh, 8000);

    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [isLive, streamId]);

  /* Load follow state for the stream's creator. */
  useEffect(() => {
    const targetId =
      liveInfo?.creatorId && typeof liveInfo.creatorId === "object"
        ? liveInfo.creatorId._id
        : liveInfo?.creatorId || creatorId;

    if (!isLive || !targetId) {
      return;
    }

    let alive = true;

    getFollowStatus(targetId)
      .then((data) => {
        if (!alive || !mountedRef.current) return;
        setFollowing(Boolean(data?.isFollowing ?? data?.following));
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, [isLive, creatorId, liveInfo?.creatorId]);

  const toggleFollow = async () => {
    const targetId =
      liveInfo?.creatorId && typeof liveInfo.creatorId === "object"
        ? liveInfo.creatorId._id
        : liveInfo?.creatorId || creatorId;

    if (!targetId || followBusy) return;

    setFollowBusy(true);
    try {
      if (following) {
        await unfollowCreator(targetId);
        setFollowing(false);
      } else {
        await followCreator(targetId);
        setFollowing(true);
      }
    } catch (err: any) {
      Alert.alert(
        "Follow failed",
        err?.response?.data?.message || "Please try again."
      );
    } finally {
      setFollowBusy(false);
    }
  };

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

  const loadDownloads =
    useDownloadStore(
      (state) =>
        state.loadDownloads
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

  /** Re-render trigger when the offline pin changes (adopted/cleared). */
  const [, setOfflinePinEpoch] = useState(0);

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
   * Make sure download state (and file verification) has been loaded, so
   * the offline pin and the Download button reflect reality even when the
   * player is the first screen opened in a session.
   */
  useEffect(() => {
    if (useDownloadStore.getState().downloads.length === 0) {
      loadDownloads().catch(console.error);
    }
  }, [loadDownloads]);

  /**
   * Offline pin lifecycle:
   * - recover honestly when the pinned local file disappeared (never keep
   *   a false completed state);
   * - adopt a completed local file only while playback has not started yet,
   *   so a download completing mid-video never restarts the stream.
   */
  useEffect(() => {
    if (!mediaId) {
      return;
    }

    const pinned = offlinePinRef.current;

    if (pinned.id === mediaId && pinned.uri) {
      let alive = true;

      verifyLocalFile(pinned.uri)
        .then((check) => {
          if (!alive || check.exists) {
            return;
          }

          offlinePinRef.current = {
            id: mediaId,
            uri: null,
          };
          setOfflinePinEpoch((epoch) => epoch + 1);

          useDownloadStore
            .getState()
            .updateDownload(mediaId, {
              status: "failed",
              uri: null,
              progress: 0,
              error: "Downloaded file is no longer on this device.",
            })
            .catch(() => {});
        })
        .catch(() => {});

      return () => {
        alive = false;
      };
    }

    if (
      !pinned.uri &&
      downloadEntry?.status === "completed" &&
      downloadEntry?.uri
    ) {
      let played = 0;

      try {
        played = player?.currentTime || 0;
      } catch {
        played = 0;
      }

      if (played > 0.5 || progressRef.current > 0.5) {
        return;
      }

      offlinePinRef.current = {
        id: mediaId,
        uri: downloadEntry.uri,
      };
      setOfflinePinEpoch((epoch) => epoch + 1);
    }
  }, [mediaId, downloadEntry, player]);

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
        if (!mediaId) {
          Alert.alert(
            "Error",
            "Media ID missing"
          );

          return;
        }

        // While a transfer is running, the button acts as Cancel.
        if (
          downloadEntry?.status === "downloading" ||
          hasActiveDownload(mediaId)
        ) {
          await cancelDownload(mediaId);

          await updateDownload(mediaId, {
            status: "cancelled",
            progress: 0,
            error: null,
          });

          return;
        }

        // Full flow: duplicate protection -> honest unavailable state ->
        // immediate downloading state -> authorization -> real byte
        // progress -> validated completion (never a false "completed").
        const result = await startDownload({
          id: mediaId,
          mediaId,
          title: title || "Untitled",
          thumbnail:
            downloadArt?.thumbnail || null,
          banner: downloadArt?.banner || null,
          downloadUrl:
            downloadUrlParam ||
            downloadArt?.downloadUrl ||
            null,
          videoUrl:
            onlineVideoUrl ||
            downloadArt?.videoUrl ||
            null,
        });

        if (result.status === "completed") {
          if (result.message === "Already available offline") {
            router.push("/(tabs)/downloads");
            return;
          }

          Alert.alert(
            "Download Complete",
            `${title || "Video"} downloaded successfully!`
          );

          return;
        }

        if (result.status === "failed") {
          Alert.alert(
            result.unavailable
              ? "Not downloadable"
              : "Download Failed",
            result.message || "Unable to download"
          );
        }

        // "cancelled" / "skipped": the UI already reflects the state.
      } catch (err: any) {
        console.log(
          err
        );

        Alert.alert(
          "Download Failed",
          err?.message || "Unable to download"
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
      // PHASE 26 — favorites are creator-only; never fake success on external.
      if (
        checkExternal({ _id: mediaId }) ||
        (typeof mediaId === "string" && mediaId.indexOf("ia:") === 0)
      ) {
        Alert.alert(
          "Not available for external titles",
          "Favorites only work on Obi-Uto creator uploads."
        );
        return;
      }

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
    /*
     * Live streams without a playback URL yet: the broadcast has not
     * reached the media server. Show an honest waiting/ended state instead
     * of a blank "Video not found" crash screen.
     */
    if (isLive) {
      return (
        <View style={styles.container}>
          <View style={styles.liveStateBox}>
            <Text style={styles.liveStateTitle}>
              {liveEnded
                ? "This live stream has ended"
                : liveWaiting
                  ? "The broadcast hasn't started yet"
                  : "Connecting to live stream..."}
            </Text>

            <Text style={styles.liveStateText}>
              {liveEnded
                ? "Thanks for watching. Check out more live streams soon."
                : liveWaiting
                  ? "The creator is setting up. This screen will start playing automatically once the broadcast begins."
                  : "If this takes too long, the stream may not have started broadcasting yet."}
            </Text>
          </View>

          {streamId && (
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
        </View>
      );
    }

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

      {isLive && (
        <View style={styles.liveHeader}>
          <View style={styles.liveHeaderMain}>
            <View style={styles.liveBadgeRow}>
              <View
                style={[
                  styles.liveBadge,
                  liveEnded && styles.liveBadgeEnded,
                ]}
              >
                <Text style={styles.liveBadgeText}>
                  {liveEnded ? "ENDED" : "LIVE"}
                </Text>
              </View>

              {!!liveInfo?.viewers && (
                <Text style={styles.liveViewers}>
                  {Math.max(0, Number(liveInfo.viewers) || 0)} watching
                </Text>
              )}
            </View>

            <Text style={styles.liveTitle} numberOfLines={2}>
              {liveInfo?.title || title || "Live stream"}
            </Text>

            <Text style={styles.liveCreator} numberOfLines={1}>
              {liveInfo?.creatorId && typeof liveInfo.creatorId === "object"
                ? `${liveInfo.creatorId.displayName || "Creator"}${liveInfo.creatorId.verified ? " ✓" : ""}`
                : "Creator"}
            </Text>
          </View>

          {following !== null && !liveEnded && (
            <TouchableOpacity
              style={[
                styles.followBtn,
                following && styles.followBtnActive,
                followBusy && { opacity: 0.6 },
              ]}
              disabled={followBusy}
              onPress={toggleFollow}
            >
              <Text
                style={[
                  styles.followText,
                  following && styles.followTextActive,
                ]}
              >
                {following ? "Following" : "Follow"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {isLive && liveEnded && (
        <View style={styles.liveEndedBanner}>
          <Text style={styles.liveEndedText}>
            The broadcast has ended. Thanks for watching!
          </Text>
        </View>
      )}

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
          {(typeof mediaId === "string" && mediaId.indexOf("ia:") === 0) ? (
            <Text style={styles.downloadError}>
              Downloads are available on Obi-Uto creator uploads only —
              external titles stream from Internet Archive.
            </Text>
          ) : (
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
          )}

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

    liveStateBox: {
      marginTop: 48,
      marginHorizontal: 24,
      padding: 20,
      backgroundColor: AppTheme.colors.surface,
      borderRadius: AppTheme.radius.md,
      borderWidth: 1,
      borderColor: AppTheme.colors.border,
    },

    liveStateTitle: {
      color: AppTheme.colors.text,
      fontSize: 18,
      fontWeight: "900",
      marginBottom: 8,
    },

    liveStateText: {
      color: AppTheme.colors.textMuted,
      lineHeight: 20,
    },

    liveHeader: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: AppTheme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: AppTheme.colors.border,
    },

    liveHeaderMain: {
      flex: 1,
      paddingRight: 12,
    },

    liveBadgeRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 6,
    },

    liveBadge: {
      backgroundColor: AppTheme.colors.live,
      borderRadius: AppTheme.radius.sm,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },

    liveBadgeEnded: {
      backgroundColor: AppTheme.colors.textSubtle,
    },

    liveBadgeText: {
      color: "#FFFFFF",
      fontSize: 11,
      fontWeight: "900",
    },

    liveViewers: {
      color: AppTheme.colors.textMuted,
      fontSize: 12,
      fontWeight: "700",
      marginLeft: 10,
    },

    liveTitle: {
      color: AppTheme.colors.text,
      fontSize: 16,
      fontWeight: "900",
      lineHeight: 21,
    },

    liveCreator: {
      color: AppTheme.colors.textMuted,
      fontSize: 13,
      marginTop: 2,
    },

    followBtn: {
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: AppTheme.radius.sm,
      backgroundColor: AppTheme.colors.accent,
    },

    followBtnActive: {
      backgroundColor: AppTheme.colors.surfaceRaised,
      borderWidth: 1,
      borderColor: AppTheme.colors.border,
    },

    followText: {
      color: AppTheme.colors.background,
      fontWeight: "900",
      fontSize: 13,
    },

    followTextActive: {
      color: AppTheme.colors.text,
    },

    liveEndedBanner: {
      backgroundColor: "rgba(242,85,85,0.12)",
      paddingVertical: 10,
      paddingHorizontal: 16,
    },

    liveEndedText: {
      color: AppTheme.colors.live,
      textAlign: "center",
      fontWeight: "800",
      fontSize: 13,
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
