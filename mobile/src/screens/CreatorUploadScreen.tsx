import React, { useState } from "react";

import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
} from "react-native";

import * as DocumentPicker from "expo-document-picker";

import { createContent } from "../api/creatorApi";

import { uploadFile } from "../api/uploadApi";

export default function CreatorUploadScreen() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [thumbnail, setThumbnail] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  const submit = async () => {
    try {
      await createContent({
        title,
        description,
        type: "movie",
        genre: ["Drama"],
        maturityRating: "PG-13",
        thumbnail: thumbnail,
        banner: "",
        videoUrl: videoUrl,
      });

      alert("Content Submitted");
    } catch (err) {
      console.log(err);
    }
  };

  const pickThumbnail = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "image/*",
    });

    if (result.canceled) return;

    const file = result.assets[0];

    uploadFile(file, setThumbnail);
  };

  const pickVideo = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "video/*",
    });

    if (result.canceled) return;

    const file = result.assets[0];

    uploadFile(file, setVideoUrl);
  };

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Title"
        value={title}
        onChangeText={setTitle}
        style={styles.input}
      />

      <TextInput
        placeholder="Description"
        value={description}
        onChangeText={setDescription}
        style={styles.input}
      />

      {/* ✅ Upload Thumbnail Button */}
      <TouchableOpacity style={styles.button} onPress={pickThumbnail}>
        <Text style={styles.text}>Upload Thumbnail</Text>
      </TouchableOpacity>

      {/* ✅ Upload Video Button */}
      <TouchableOpacity style={styles.button} onPress={pickVideo}>
        <Text style={styles.text}>Upload Video</Text>
      </TouchableOpacity>

      {/* Submit Button */}
      <TouchableOpacity style={styles.button} onPress={submit}>
        <Text style={styles.text}>Upload</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },

  input: {
    borderWidth: 1,
    marginBottom: 12,
    padding: 12,
  },

  button: {
    backgroundColor: "#6C5CE7",
    padding: 16,
    marginBottom: 10,
  },

  text: {
    color: "#fff",
    textAlign: "center",
  },
});