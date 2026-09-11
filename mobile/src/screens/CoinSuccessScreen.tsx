import React from "react";

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

import {
  router,
} from "expo-router";

export default function CoinSuccessScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>
        🎉
      </Text>

      <Text style={styles.title}>
        Coins Added Successfully
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() =>
          router.replace(
            "/home"
          )
        }
      >
        <Text style={styles.buttonText}>
          Continue
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0D0D",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  icon: {
    fontSize: 60,
    marginBottom: 20,
  },

  title: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 30,
    textAlign: "center",
  },

  button: {
    backgroundColor: "#6C5CE7",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },

  buttonText: {
    color: "#FFF",
    fontWeight: "700",
  },
});