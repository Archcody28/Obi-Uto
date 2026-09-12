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
} from "react-native";

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

export default function PlayerScreen() {
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

        await authorizeDownload(
          mediaId
        );

        const result =
          await downloadVideo(
            onlineVideoUrl,
            `${mediaId}.mp4`,
            (p) => {
              console.log(
                "Download:",
                Math.round(
                  p * 100
                ) + "%"
              );
            }
          );

        await addDownload({
          id: mediaId,
          title,
          uri: result.uri,
          progress: 1,
        });

        Alert.alert(
          "Success",
          "Download Complete"
        );
      } catch (err: any) {
        console.log(
          err
        );

        Alert.alert(
          "Download Failed",
          err
            ?.response
            ?.data
            ?.message ||
            "Unable to download"
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
    <View
      style={
        styles.container
      }
    >
      <VideoView
        style={
          styles.video
        }
        player={player}
      />

      {nextEpisode &&
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

      {!localUri && (
        <TouchableOpacity
          style={
            styles.downloadBtn
          }
          onPress={
            handleDownload
          }
        >
          <Text
            style={
              styles.downloadText
            }
          >
            Download
          </Text>
        </TouchableOpacity>
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
          ❤️ Favorite
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        "#000",
    },

    video: {
      flex: 1,
    },

    errorText: {
      color: "#fff",
      textAlign:
        "center",
      marginTop: 50,
      fontSize: 18,
    },

    downloadBtn: {
      backgroundColor:
        "#6C5CE7",
      padding: 15,
      marginTop: 10,
      marginHorizontal: 16,
      borderRadius: 8,
    },

    favoriteBtn: {
      backgroundColor:
        "#E84393",
      padding: 15,
      marginTop: 10,
      marginHorizontal: 16,
      borderRadius: 8,
    },

    downloadText: {
      color: "#fff",
      textAlign:
        "center",
      fontWeight: "700",
    },

    nextContainer: {
      backgroundColor:
        "#1A1A1A",
      margin: 16,
      padding: 16,
      borderRadius: 12,
    },

    nextText: {
      color: "#AAA",
      textAlign:
        "center",
    },

    nextTitle: {
      color: "#FFF",
      fontWeight: "700",
      textAlign:
        "center",
      marginVertical: 8,
    },

    cancelBtn: {
      backgroundColor:
        "#E74C3C",
      marginTop: 12,
      padding: 12,
      borderRadius: 8,
    },
  });
