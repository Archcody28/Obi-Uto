import React from "react";

import {
  View,
  Text,
  StyleSheet,
} from "react-native";

export default function ContentStatsRoute() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        Content statistics are not available yet.
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
