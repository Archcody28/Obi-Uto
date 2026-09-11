import React from "react";

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

import {
  followCreator,
} from "../api/followApi";

export default function CreatorProfileScreen() {
  const handleFollow =
    async () => {
      await followCreator(
        "USER_ID",
        "CREATOR_ID"
      );

      alert(
        "Creator Followed"
      );
    };

  return (
    <View style={styles.container}>
      <Text style={styles.name}>
        Creator Profile
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={
          handleFollow
        }
      >
        <Text
          style={styles.text}
        >
          Follow
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent:
        "center",
      alignItems:
        "center",
      backgroundColor:
        "#0D0D0D",
    },

    name: {
      color: "#fff",
      fontSize: 24,
      marginBottom: 20,
    },

    button: {
      backgroundColor:
        "#6C5CE7",
      padding: 15,
      borderRadius: 12,
    },

    text: {
      color: "#fff",
      fontWeight: "700",
    },
  });