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
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";

import {
  useWatchStore,
} from "../store/watchStore";

import {
  continueWatching,
} from "../api/watchApi";
import { AppTheme } from "../constants/theme";

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
              <TouchableOpacity
                style={styles.card}
                onPress={() =>
                  router.push({
                    pathname: "/details",
                    params: {
                      id: item.id,
                    },
                  })
                }
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
              </TouchableOpacity>
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
                <TouchableOpacity
                  key={item._id}
                  style={
                    styles.card
                  }
                  onPress={() =>
                    router.push({
                      pathname: "/details",
                      params: {
                        id:
                          item.media?._id ||
                          item.media,
                      },
                    })
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
                </TouchableOpacity>
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
        AppTheme.colors.surface,
      borderWidth: 1,
      borderColor:
        AppTheme.colors.border,
      borderRadius: 12,
      padding: 15,
      marginHorizontal: 10,
    },

    movie: {
      color: "#fff",
      fontWeight: "700",
    },

    progress: {
      color: AppTheme.colors.accent,
      marginTop: 10,
    },
  });
