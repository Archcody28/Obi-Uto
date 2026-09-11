import React from "react";
import {
  View,
  Text,
  StyleSheet,
} from "react-native";

export default function CreatorScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Creator Profile
      </Text>
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
    },

    title: {
      fontSize: 28,
      fontWeight: "700",
    },
  });