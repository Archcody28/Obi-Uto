import React from "react";

import {
  View,
  Text,
  StyleSheet,
} from "react-native";

export default function EditContentRoute() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        Edit content is not available yet.
      </Text>
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        "#0D0D0D",
      padding: 20,
    },

    text: {
      color: "#FFF",
      fontSize: 16,
    },
  });
