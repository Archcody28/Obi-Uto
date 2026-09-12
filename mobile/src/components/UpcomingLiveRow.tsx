import React from "react";

import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from "react-native";

import LiveCountdown from "./LiveCountdown";
import { AppTheme } from "../constants/theme";

export default function UpcomingLiveRow({
  streams = [],
}) {
  if (!streams.length) {
    return (
      <Text style={styles.empty}>
        No upcoming live events.
      </Text>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>
        Upcoming Live
      </Text>

      <FlatList
        horizontal
        data={streams}
        keyExtractor={(item) => item._id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.78}
            accessibilityRole="button"
            accessibilityLabel={`${item.title} scheduled live stream`}
          >
            <LiveCountdown
              scheduledFor={
                item.scheduledFor
              }
              prefix="Starts in"
            />

            <Text
              style={styles.title}
              numberOfLines={2}
            >
              {item.title}
            </Text>

            <Text style={styles.meta}>
              Live event scheduled
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },

  heading: {
    color: AppTheme.colors.text,
    fontSize: 20,
    fontWeight: "800",
    marginHorizontal: 16,
    marginBottom: 10,
  },

  listContent: {
    paddingLeft: 16,
    paddingRight: 2,
  },

  empty: {
    color: AppTheme.colors.textSubtle,
    marginVertical: 18,
    marginHorizontal: 16,
  },

  card: {
    width: 180,
    minHeight: 136,
    backgroundColor:
      AppTheme.colors.surface,
    borderRadius:
      AppTheme.radius.md,
    borderWidth: 1,
    borderColor:
      AppTheme.colors.border,
    padding: 14,
    marginRight: 12,
    justifyContent:
      "space-between",
  },

  title: {
    color: AppTheme.colors.text,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 21,
  },

  meta: {
    color:
      AppTheme.colors.textSubtle,
    fontSize: 12,
    marginTop: 8,
  },
});
