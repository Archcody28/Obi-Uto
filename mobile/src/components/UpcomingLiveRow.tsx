import React from "react";

import {
  View,
  Text,
  FlatList,
} from "react-native";

import MediaCard from "./MediaCard";
import LiveCountdown from "./LiveCountdown";

export default function UpcomingLiveRow({
  streams = [],
}) {
  if (!streams.length) {
    return (
      <Text
        style={{
          color: "#AAA",
          marginVertical: 20,
          marginHorizontal: 12,
        }}
      >
        No upcoming live events.
      </Text>
    );
  }

  return (
    <View
      style={{
        marginBottom: 20,
      }}
    >
      <Text
        style={{
          color: "#FFF",
          fontSize: 20,
          fontWeight: "700",
          marginHorizontal: 10,
          marginBottom: 10,
        }}
      >
        📅 UPCOMING LIVE
      </Text>

      <FlatList
        horizontal
        data={streams}
        keyExtractor={(item) => item._id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingLeft: 10,
        }}
        renderItem={({ item }) => (
          <View>
            <LiveCountdown
              scheduledFor={
                item.scheduledFor
              }
              prefix="📅 Starts in"
            />

            <MediaCard
              item={item}
            />
          </View>
        )}
      />
    </View>
  );
}