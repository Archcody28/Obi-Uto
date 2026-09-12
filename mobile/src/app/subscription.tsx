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

export default function SubscriptionScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>
        Subscription
      </Text>
      <Text style={styles.title}>
        Subscription management is not available yet.
      </Text>
      <Text style={styles.copy}>
        Obi-Uto has backend subscription models, but this mobile app does not
        currently include a supported subscription management flow.
      </Text>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() =>
          router.replace("/(tabs)/profile" as any)
        }
      >
        <Text style={styles.primaryText}>
          Back to Profile
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: AppTheme.colors.background,
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
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 34,
  },

  copy: {
    color: AppTheme.colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 14,
    marginBottom: 24,
  },

  primaryButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: AppTheme.radius.md,
    backgroundColor: AppTheme.colors.accent,
  },

  primaryText: {
    color: AppTheme.colors.background,
    fontWeight: "900",
  },
});
