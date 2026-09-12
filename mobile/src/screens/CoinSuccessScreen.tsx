import React from "react";

import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  router,
} from "expo-router";

import { AppTheme } from "../constants/theme";

export default function CoinSuccessScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>
        Payment complete
      </Text>

      <Text style={styles.title}>
        Coins added successfully.
      </Text>

      <Text style={styles.copy}>
        Your wallet balance will refresh the next time the wallet opens.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() =>
          router.replace(
            "/(tabs)/home" as any
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
    backgroundColor: AppTheme.colors.background,
    justifyContent: "center",
    padding: 24,
  },

  kicker: {
    color: AppTheme.colors.accent,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 8,
  },

  title: {
    color: AppTheme.colors.text,
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 36,
  },

  copy: {
    color: AppTheme.colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
    marginBottom: 24,
  },

  button: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppTheme.colors.accent,
    borderRadius: AppTheme.radius.md,
  },

  buttonText: {
    color: AppTheme.colors.background,
    fontWeight: "900",
  },
});
