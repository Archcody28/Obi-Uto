import React, {
  useEffect,
  useState,
} from "react";

import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
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
  usePlayerStore,
} from "../store/playerStore";
import MediaRow from "../components/MediaRow";
export default function DetailsScreen() {
  const params =
  useLocalSearchParams();

const id =
  Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const [media, setMedia] =
    useState(null);

  const [similar,
    setSimilar] =
    useState([]);

  const [
    episodes,
    setEpisodes,
  ] = useState([]);

  const [
    comments,
    setComments,
  ] = useState([]);

  const [
    commentText,
    setCommentText,
  ] = useState("");

  const [
    liked,
    setLiked,
  ] = useState(false);

  const setQueue =
    usePlayerStore(
      (state) =>
        state.setQueue
    );

  useEffect(() => {
    loadMedia();
    loadSimilar();
  }, [id]);

  const loadMedia =
    async () => {
      try {
        const data =
          await getMediaDetails(
            id
          );

        setMedia(data);

        /*
         Load episodes
        */
        if (
          data.type ===
          "series"
        ) {
          const eps =
            await getEpisodes(
              data._id
            );

          setEpisodes(
            eps
          );
        } else {
          setEpisodes([]);
        }

        /*
         Load comments
        */
        const loadedComments =
          await getComments(
            data._id
          );

        setComments(
          loadedComments
        );
      } catch (err) {
        console.log(err);
      }
    };

  const loadSimilar =
    async () => {
      try {
        const data =
          await getSimilar(id);

        setSimilar(data);
      } catch (err) {
        console.log(err);
      }
    };

  if (!media) {
    return (
      <View
        style={
          styles.loadingContainer
        }
      >
        <Text
          style={
            styles.loadingText
          }
        >
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={comments}
      keyExtractor={(
        item
      ) => item._id}
      ListHeaderComponent={
        <>
          <Image
            source={{
              uri:
                media.thumbnail,
            }}
            style={
              styles.poster
            }
          />

          <Text
            style={
              styles.title
            }
          >
            {media.title}
          </Text>

          <Text
            style={
              styles.meta
            }
          >
            {Array.isArray(
              media.genre
            )
              ? media.genre.join(
                  ", "
                )
              : media.genre}
          </Text>

          <Text
            style={
              styles.description
            }
          >
            {
              media.description
            }
          </Text>

          {/* Episodes */}
          {episodes.length >
            0 && (
            <>
              <Text
                style={{
                  color:
                    "#FFF",
                  fontSize: 20,
                  marginTop: 20,
                  marginBottom: 10,
                }}
              >
                Episodes
              </Text>

              <FlatList
                data={
                  episodes
                }
                keyExtractor={(
                  item
                ) =>
                  item._id?.toString()
                }
                scrollEnabled={
                  false
                }
                renderItem={({
                  item,
                }) => (
                  <TouchableOpacity
                    style={
                      styles.playButton
                    }
                    onPress={() =>
                      router.push(
                        {
                          pathname:
                            "/player",

                          params:
                            {
                              mediaId:
                                item._id,

                              videoUrl:
                                item.videoUrl,

                              title:
                                item
                                  .seriesInfo
                                  ?.episodeTitle ||
                                item.title,
                            },
                        }
                      )
                    }
                  >
                    <Text
                      style={
                        styles.playText
                      }
                    >
                      S
                      {
                        item
                          .seriesInfo
                          ?.seasonNumber
                      }
                      E
                      {
                        item
                          .seriesInfo
                          ?.episodeNumber
                      }{" "}
                      —{" "}
                      {
                        item
                          .seriesInfo
                          ?.episodeTitle
                      }
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </>
          )}

          {media.locked ? (
            <TouchableOpacity
              style={
                styles.playButton
              }
              onPress={() =>
                alert(
                  "Premium subscription required"
                )
              }
            >
              <Text
                style={
                  styles.playText
                }
              >
                🔒 Premium
                Content
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              {/* Play */}
              <TouchableOpacity
                style={
                  styles.playButton
                }
                onPress={() => {
                  setQueue(
                    [
                      {
                        mediaId:
                          media._id,

                        title:
                          media.title,

                        videoUrl:
                          media.videoUrl,
                      },
                    ],
                    0
                  );

                  router.push(
                    {
                      pathname:
                        "/player",

                      params:
                        {
                          mediaId:
                            media._id,

                          videoUrl:
                            media.videoUrl,

                          title:
                            media.title,
                        },
                    }
                  );
                }}
              >
                <Text
                  style={
                    styles.playText
                  }
                >
                  ▶ Play
                </Text>
              </TouchableOpacity>

              {/* Like */}
              <TouchableOpacity
                style={
                  styles.playButton
                }
                onPress={async () => {
                  try {
                    const result =
                      await toggleLike(
                        media._id
                      );

                    setLiked(
                      result.liked
                    );
                  } catch (
                    err
                  ) {
                    console.log(
                      err
                    );
                  }
                }}
              >
                <Text
                  style={
                    styles.playText
                  }
                >
                  {liked
                    ? "❤️ Liked"
                    : "🤍 Like"}
                </Text>
              </TouchableOpacity>

              {/* Comment Input */}
              <TextInput
                value={
                  commentText
                }
                onChangeText={
                  setCommentText
                }
                placeholder="Add a comment..."
                placeholderTextColor="#999"
                style={
                  styles.input
                }
              />

              {/* Post Comment */}
              <TouchableOpacity
                style={
                  styles.playButton
                }
                onPress={async () => {
                  try {
                    if (
                      !commentText.trim()
                    ) {
                      return;
                    }

                    await addComment(
                      media._id,
                      commentText
                    );

                    setCommentText(
                      ""
                    );

                    const updated =
                      await getComments(
                        media._id
                      );

                    setComments(
                      updated
                    );
                  } catch (
                    err
                  ) {
                    console.log(
                      err
                    );
                  }
                }}
              >
                <MediaRow
  title="Because You Watched This"
  data={similar}
/>
                <Text
                  style={
                    styles.playText
                  }
                >
                  Post
                  Comment
                </Text>
              </TouchableOpacity>
            </>
          )}
        </>
      }
      renderItem={({
        item,
      }) => (
        <View
          style={{
            marginTop: 15,
          }}
        >
          <Text
            style={{
              color:
                "#FFF",
              fontWeight:
                "700",
            }}
          >
            {
              item.userId
                ?.name
            }
          </Text>

          <Text
            style={{
              color:
                "#DDD",
            }}
          >
            {item.text}
          </Text>
        </View>
      )}
      ListFooterComponent={
        <View
          style={{
            height: 30,
          }}
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
        "#0D0D0D",
      padding: 20,
    },

    loadingContainer:
      {
        flex: 1,
        justifyContent:
          "center",
        alignItems:
          "center",
        backgroundColor:
          "#0D0D0D",
      },

    loadingText: {
      color: "#fff",
      fontSize: 18,
    },

    poster: {
      width: "100%",
      height: 350,
      borderRadius: 20,
    },

    title: {
      color: "#fff",
      fontSize: 28,
      fontWeight: "700",
      marginTop: 15,
    },

    meta: {
      color: "#aaa",
      marginTop: 10,
    },

    description: {
      color: "#ddd",
      marginTop: 15,
    },

    playButton: {
      backgroundColor:
        "#6C5CE7",
      padding: 16,
      borderRadius: 12,
      marginTop: 20,
    },

    playText: {
      color: "#fff",
      textAlign:
        "center",
      fontWeight: "700",
    },

    input: {
      backgroundColor:
        "#1A1A1A",
      color: "#FFF",
      borderRadius: 12,
      padding: 16,
      marginTop: 20,
    },
  });
