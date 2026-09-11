import React from "react";

import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

import { router } from "expo-router";

export default function MediaCard({
  item,
}) {
  return (
    <TouchableOpacity
      onPress={() =>
        router.push({ pathname: "/details", params: { id: item._id, }, })
      }
    >
      <View style={styles.card}>
        <Image
          source={{
            uri:
              item.thumbnail,
          }}
          style={styles.image}
        />

        <Text
          style={styles.title}
          numberOfLines={1}
        >
          {item.title}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 140,
    marginRight: 12,
  },

  image: {
    width: 140,
    height: 200,
    borderRadius: 12,
  },

  title: {
    color: "#fff",
    marginTop: 8,
  },
});