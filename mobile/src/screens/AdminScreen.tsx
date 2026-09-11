import React, {
  useState,
} from "react";

import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

import {
  createMedia,
} from "../api/adminApi";

import {
  router,
} from "expo-router";

export default function AdminScreen() {
  const [title, setTitle] =
    useState("");

  const [description,
    setDescription] =
    useState("");

  const [thumbnail,
    setThumbnail] =
    useState("");

  const [videoUrl,
    setVideoUrl] =
    useState("");

  const handleUpload =
    async () => {
      try {
        await createMedia({
          title,
          description,
          thumbnail,
          videoUrl,
          type: "movie",
        });

        alert(
          "Media Uploaded"
        );

        setTitle("");
        setDescription("");
        setThumbnail("");
        setVideoUrl("");
      } catch (err) {
        console.log(err);
      }
    };

  return (
    <ScrollView
      style={styles.container}
    >
      <Text style={styles.title}>
        Admin Upload
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Title"
        value={title}
        onChangeText={setTitle}
      />

      <TextInput
        style={styles.input}
        placeholder="Description"
        value={description}
        onChangeText={
          setDescription
        }
      />

      <TextInput
        style={styles.input}
        placeholder="Thumbnail URL"
        value={thumbnail}
        onChangeText={
          setThumbnail
        }
      />

      <TextInput
        style={styles.input}
        placeholder="Video URL"
        value={videoUrl}
        onChangeText={
          setVideoUrl
        }
      />

      <TouchableOpacity
        style={styles.button}
        onPress={
          handleUpload
        }
      >
        <Text
          style={styles.text}
        >
          Upload Media
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.button,
          {
            marginTop: 15,
          },
        ]}
        onPress={() =>
          router.push(
            "/admin-media"
          )
        }
      >
        <Text
          style={styles.text}
        >
          Manage Media
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        "#0D0D0D",
      padding: 20,
    },

    title: {
      color: "#fff",
      fontSize: 28,
      marginBottom: 20,
    },

    input: {
      backgroundColor:
        "#1E1E1E",
      color: "#fff",
      padding: 15,
      borderRadius: 10,
      marginBottom: 15,
    },

    button: {
      backgroundColor:
        "#6C5CE7",
      padding: 15,
      borderRadius: 10,
    },

    text: {
      color: "#fff",
      textAlign:
        "center",
    },
  });