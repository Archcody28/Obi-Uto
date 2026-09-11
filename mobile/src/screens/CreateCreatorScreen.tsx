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
  createCreator,
} from "../api/creatorApi";

export default function CreateCreatorScreen() {
  const [
    creatorName,
    setCreatorName,
  ] = useState("");

  const [
    bio,
    setBio,
  ] = useState("");

  const [
    avatarUrl,
    setAvatarUrl,
  ] = useState("");

  const [
    bannerUrl,
    setBannerUrl,
  ] = useState("");

  const handleSubmit =
    async () => {
      try {
        await createCreator({
          creatorName,
          bio,
          avatarUrl,
          bannerUrl,
        });

        alert(
          "Creator Profile Created"
        );

        setCreatorName("");
        setBio("");
        setAvatarUrl("");
        setBannerUrl("");
      } catch (err) {
        console.log(err);
        alert(
          "Failed To Create Creator Profile"
        );
      }
    };

  return (
    <ScrollView
      style={styles.container}
    >
      <Text style={styles.title}>
        Become A Creator
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Creator Name"
        placeholderTextColor="#888"
        value={creatorName}
        onChangeText={
          setCreatorName
        }
      />

      <TextInput
        style={[
          styles.input,
          styles.bioInput,
        ]}
        placeholder="Bio"
        placeholderTextColor="#888"
        multiline
        value={bio}
        onChangeText={setBio}
      />

      <TextInput
        style={styles.input}
        placeholder="Avatar URL"
        placeholderTextColor="#888"
        value={avatarUrl}
        onChangeText={
          setAvatarUrl
        }
      />

      <TextInput
        style={styles.input}
        placeholder="Banner URL"
        placeholderTextColor="#888"
        value={bannerUrl}
        onChangeText={
          setBannerUrl
        }
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleSubmit}
      >
        <Text style={styles.buttonText}>
          Become Creator
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
      fontWeight: "700",
      marginBottom: 25,
    },

    input: {
      backgroundColor:
        "#1A1A1A",
      color: "#fff",
      padding: 15,
      borderRadius: 12,
      marginBottom: 15,
    },

    bioInput: {
      height: 120,
      textAlignVertical:
        "top",
    },

    button: {
      backgroundColor:
        "#6C5CE7",
      padding: 16,
      borderRadius: 12,
      marginTop: 10,
    },

    buttonText: {
      color: "#fff",
      textAlign:
        "center",
      fontSize: 16,
      fontWeight: "700",
    },
  });