
import React, {
  useEffect,
} from "react";

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

import {
  router,
} from "expo-router";

import {
  useProfileStore,
} from "../store/profileStore";

export default function ProfileSelectScreen() {
  const profiles =
    useProfileStore(
      (state) =>
        state.profiles
    );

  const loadProfiles =
    useProfileStore(
      (state) =>
        state.loadProfiles
    );

  const setActiveProfile =
    useProfileStore(
      (state) =>
        state.setActiveProfile
    );

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Who is Watching?
      </Text>

      {profiles.map(
        (profile) => (
          <TouchableOpacity
            key={profile.id}
            style={styles.card}
            onPress={async () => {
              if (profile.pin) {
  const entered =
    prompt(
      "Enter Profile PIN"
    );

  if (
    entered !== profile.pin
  ) {
    alert(
      "Incorrect PIN"
    );

    return;
  }
}

await setActiveProfile(
  profile
);

router.replace(
  "/(tabs)/home" as any
);
            }}
          >
            {/* Avatar */}
            <Text
              style={styles.avatar}
            >
              {
                profile.avatar ||
                "👤"
              }
            </Text>

            {/* Profile Name */}
            <Text
              style={styles.name}
            >
              {profile.name}
            </Text>
          </TouchableOpacity>
        )
      )}

      <TouchableOpacity
        style={styles.addBtn}
        onPress={async () => {
          const profile = {
            id: Date.now().toString(),
            name: `Profile ${
              profiles.length + 1
            }`,
            avatar: "👤",
            isKids: false,
            pin: "",
            maxRating: "PG",
          };

          await useProfileStore
            .getState()
            .addProfile(
              profile
            );
        }}
      >
        <Text
          style={styles.addText}
        >
          + Add Profile
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
      padding: 20,
    },

    title: {
      color: "#FFF",
      fontSize: 28,
      fontWeight: "700",
      marginBottom: 40,
    },

    card: {
      width: 180,
      backgroundColor:
        "#1A1A1A",
      padding: 20,
      borderRadius: 12,
      marginBottom: 12,
      alignItems:
        "center",
    },

    avatar: {
      fontSize: 40,
      marginBottom: 10,
    },

    name: {
      color: "#FFF",
      fontSize: 18,
      textAlign: "center",
    },

    addBtn: {
      marginTop: 30,
      backgroundColor:
        "#6C5CE7",
      padding: 16,
      borderRadius: 12,
      width: 180,
    },

    addText: {
      color: "#FFF",
      textAlign: "center",
      fontWeight: "700",
    },
  });
