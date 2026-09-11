import React,
{
  useEffect,
  useState,
} from "react";

import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

import {
  getAllMedia,
  deleteMedia,
} from "../api/adminApi";

export default function AdminMediaScreen() {
  const [media,
    setMedia] =
    useState([]);

  useEffect(() => {
    loadMedia();
  }, []);

  const loadMedia =
    async () => {
      const data =
        await getAllMedia();

      setMedia(data);
    };

  const handleDelete =
    async (id) => {
      await deleteMedia(id);

      loadMedia();
    };

  return (
    <View
      style={
        styles.container
      }
    >
      <FlatList
        data={media}
        keyExtractor={
          (item) =>
            item._id
        }
        renderItem={({
          item,
        }) => (
          <View
            style={
              styles.card
            }
          >
            <Text
              style={
                styles.title
              }
            >
              {item.title}
            </Text>

            <TouchableOpacity
              onPress={() =>
                handleDelete(
                  item._id
                )
              }
            >
              <Text
                style={
                  styles.delete
                }
              >
                Delete
              </Text>
            </TouchableOpacity>
          </View>
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
        "#111",
      padding: 20,
    },

    card: {
      backgroundColor:
        "#222",
      padding: 15,
      borderRadius: 10,
      marginBottom: 10,
    },

    title: {
      color: "#fff",
      fontSize: 18,
    },

    delete: {
      color: "red",
      marginTop: 8,
    },
  });