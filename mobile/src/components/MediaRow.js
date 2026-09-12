import React from "react";
import {
  FlatList,
  Text,
  View,
  StyleSheet,
} from "react-native";

import MediaCard from "./MediaCard";
import { AppTheme } from "../constants/theme";

export default function MediaRow({
  title,
  data,
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {title}
      </Text>

      {data?.length ? (
        <FlatList
        horizontal
        data={data}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={
          styles.listContent
        }
        keyExtractor={(item) =>
  item._id?.toString()
}
        renderItem={({ item }) => (
          <MediaCard item={item} />
        )}
      />
      ) : (
        <Text style={styles.empty}>
          No titles available yet.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },

  title: {
    color: AppTheme.colors.text,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 12,
    marginLeft: 16,
  },

  listContent: {
    paddingLeft: 16,
    paddingRight: 2,
  },

  empty: {
    color:
      AppTheme.colors.textSubtle,
    marginLeft: 16,
    marginBottom: 6,
  },
});
