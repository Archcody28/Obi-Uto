import React, {
  useEffect,
  useState,
} from "react";

import {
  FlatList,
  View,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";

import {
  useWatchStore,
} from "../store/watchStore";

import {
  continueWatching,
} from "../api/watchApi";

export default function ContinueWatchingRow() {
  // Local Zustand data
  const watching = useWatchStore(
    (state) => state.watching
  );

  // API data
  const [items, setItems] =
    useState([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const data =
        await continueWatching();

      setItems(data);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <View>
      {/* LOCAL WATCHING */}
      {watching.length > 0 && (
        <>
          <Text style={styles.title}>
            Continue Watching
          </Text>

          <FlatList
            horizontal
            data={watching}
            keyExtractor={(item) =>
              item.id
            }
            renderItem={({
              item,
            }) => (
              <View
                style={styles.card}
              >
                <Text
                  style={
                    styles.movie
                  }
                >
                  {item.title}
                </Text>

                <Text
                  style={
                    styles.progress
                  }
                >
                  {item.progress}%
                </Text>
              </View>
            )}
          />
        </>
      )}

      {/* SERVER WATCHING */}
      {items.length > 0 && (
        <>
          <Text
            style={
              styles.serverTitle
            }
          >
            Continue Watching
            (Server)
          </Text>

          <ScrollView
            horizontal
          >
            {items.map(
              (item) => (
                <View
                  key={item._id}
                  style={
                    styles.card
                  }
                >
                  <Text
                    style={
                      styles.movie
                    }
                  >
                    {
                      item.media
                        ?.title
                    }
                  </Text>

                  <Text
                    style={
                      styles.progress
                    }
                  >
                    {
                      item.progress
                    }
                    %
                  </Text>
                </View>
              )
            )}
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles =
  StyleSheet.create({
    title: {
      color: "#fff",
      fontSize: 20,
      fontWeight: "700",
      margin: 10,
    },

    serverTitle: {
      color: "#E84393",
      fontSize: 20,
      fontWeight: "700",
      margin: 10,
      marginTop: 20,
    },

    card: {
      width: 160,
      backgroundColor:
        "#222",
      borderRadius: 12,
      padding: 15,
      marginHorizontal: 10,
    },

    movie: {
      color: "#fff",
      fontWeight: "700",
    },

    progress: {
      color: "#6C5CE7",
      marginTop: 10,
    },
  });