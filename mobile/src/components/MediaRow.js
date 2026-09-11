import React from "react";
import {
  FlatList,
  Text,
  View,
  StyleSheet,
} from "react-native";

import MediaCard from "./MediaCard";

export default function MediaRow({
  title,
  data,
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {title}
      </Text>

      <FlatList
        horizontal
        data={data}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) =>
  item._id?.toString()
}
        renderItem={({ item }) => (
          <MediaCard item={item} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    marginBottom: 10,
  },

  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
    marginLeft: 10,
  },
});