import React,
{
  useEffect,
  useState,
} from "react";

import {
  Text,
  FlatList,
  TouchableOpacity,
} from "react-native";

import { router } from "expo-router";

import {
  getLiveStreams,
} from "../api/liveStreamApi";

export default function LiveStreamsScreen() {
  const [
    streams,
    setStreams,
  ] = useState([]);

  const loadStreams =
    () =>
      getLiveStreams()
        .then(setStreams)
        .catch(console.error);

  useEffect(() => {
    loadStreams();

    const timer =
      setInterval(
        loadStreams,
        10000
      );

    return () =>
      clearInterval(
        timer
      );
  }, []);

  return (
    <FlatList
      data={streams}
      keyExtractor={(item) =>
        item._id
      }
      renderItem={({
        item,
      }) => (
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname:
                "/player",
              params: {
                mediaId:
                  item._id,
                videoUrl:
                  item.playbackUrl,
                title:
                  item.title,
              },
            })
          }
        >
          {item.isLive && (
            <Text
              style={{
                color: "red",
                fontWeight: "700",
              }}
            >
              🔴 LIVE
            </Text>
          )}

          <Text>
            {item.title}
          </Text>
        </TouchableOpacity>
      )}
    />
  );
}