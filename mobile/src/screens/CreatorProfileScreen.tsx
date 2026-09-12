import React from "react";

import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  useLocalSearchParams,
} from "expo-router";

import {
  followCreator,
} from "../api/followApi";
import { AppTheme } from "../constants/theme";

export default function CreatorProfileScreen() {
  const params =
    useLocalSearchParams();
  const creatorId =
    Array.isArray(
      params.creatorId
    )
      ? params.creatorId[0]
      : params.creatorId;

  const handleFollow =
    async () => {
      if (!creatorId) {
        Alert.alert(
          "Creator unavailable",
          "This profile is missing a creator ID."
        );
        return;
      }

      try {
        await followCreator(
          creatorId
        );

        Alert.alert(
          "Creator followed",
          "You will see updates from this creator."
        );
      } catch (err: any) {
        console.log(err);
        Alert.alert(
          "Follow failed",
          err?.response?.data?.message ||
            "Please try again."
        );
      }
    };

  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>
        Creator
      </Text>
      <Text style={styles.name}>
        Creator Profile
      </Text>

      <TouchableOpacity
        style={[
          styles.button,
          !creatorId &&
            styles.disabled,
        ]}
        disabled={!creatorId}
        onPress={handleFollow}
      >
        <Text style={styles.text}>
          Follow
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

  name: {
    color: AppTheme.colors.text,
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 20,
  },

  button: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppTheme.colors.accent,
    borderRadius: AppTheme.radius.md,
  },

  disabled: {
    opacity: 0.5,
  },

  text: {
    color: AppTheme.colors.background,
    fontWeight: "900",
  },
});
