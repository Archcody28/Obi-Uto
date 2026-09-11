import React, {
  useState,
} from "react";

import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
} from "react-native";

const trendingSearches = [
  "Avatar",
  "Breaking Bad",
  "Interstellar",
  "Drake",
  "Joe Rogan",
];

export default function SearchScreen() {
  const [query, setQuery] =
    useState("");

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Search movies, music..."
        placeholderTextColor="#777"
        value={query}
        onChangeText={setQuery}
        style={styles.input}
      />

      <Text style={styles.heading}>
        Trending Searches
      </Text>

      <FlatList
        data={trendingSearches}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <Text style={styles.item}>
            🔥 {item}
          </Text>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0D0D",
    padding: 16,
  },

  input: {
    backgroundColor: "#1A1A1A",
    color: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
  },

  heading: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },

  item: {
    color: "#ddd",
    fontSize: 16,
    marginBottom: 10,
  },
});