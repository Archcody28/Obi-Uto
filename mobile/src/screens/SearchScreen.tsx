import React, {
  useState,
} from "react";

import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";

import {
  router,
} from "expo-router";

import {
  searchMedia,
} from "../api/searchApi";

export default function SearchScreen() {
  const [query, setQuery] =
    useState("");

  const [results, setResults] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");
  const [searched, setSearched] =
    useState(false);

  const doSearch =
    async (q: string) => {
      const term = (q ?? "").trim();

      if (!term) {
        setResults([]);
        setSearched(false);
        setError("");
        return;
      }

      setLoading(true);
      setError("");

      try {
        const data =
          await searchMedia(term);

        setResults(data);
        setSearched(true);
      } catch (err: any) {
        console.log(err);
        setError(
          err?.response?.data
            ?.error ||
            "Search failed"
        );
        setResults([]);
        setSearched(true);
      } finally {
        setLoading(false);
      }
    };

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Search movies, music..."
        placeholderTextColor="#777"
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={() =>
          doSearch(query)
        }
        returnKeyType="search"
        autoCorrect={false}
        style={styles.input}
      />

      {loading && (
        <ActivityIndicator
          color="#6C5CE7"
          style={{
            marginTop: 20,
          }}
        />
      )}

      {!!error && (
        <Text
          style={styles.error}
        >
          {error}
        </Text>
      )}

      {searched &&
        !loading &&
        !error &&
        results.length === 0 && (
          <Text
            style={styles.empty}
          >
            No results found
          </Text>
        )}

      <FlatList
        data={results}
        keyExtractor={(item: any) =>
          item._id?.toString() ??
          item._id
        }
        ListHeaderComponent={
          results.length > 0 ? (
            <Text
              style={styles.heading}
            >
              {results.length}{" "}
              Result
              {results.length === 1
                ? ""
                : "s"}
            </Text>
          ) : null
        }
        renderItem={({
          item,
        }: any) => (
          <TouchableOpacity
            style={
              styles.itemCard
            }
            onPress={() =>
              router.push({
                pathname:
                  "/details",
                params: {
                  id: item._id,
                },
              })
            }
          >
            <Text
              style={
                styles.itemTitle
              }
            >
              {item.title}
            </Text>
            <Text
              style={
                styles.itemMeta
              }
            >
              {item.type}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        "#0D0D0D",
      padding: 16,
    },

    input: {
      backgroundColor:
        "#1A1A1A",
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

    error: {
      color: "#E74C3C",
      marginBottom: 12,
    },

    empty: {
      color: "#AAA",
      textAlign: "center",
      marginTop: 30,
    },

    itemCard: {
      backgroundColor:
        "#1A1A1A",
      padding: 15,
      borderRadius: 10,
      marginBottom: 10,
    },

    itemTitle: {
      color: "#FFF",
      fontSize: 16,
      fontWeight: "600",
    },

    itemMeta: {
      color: "#999",
      marginTop: 4,
      fontSize: 12,
      textTransform:
        "capitalize",
    },
  });