import React, {
  useEffect,
} from "react";

import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  router,
} from "expo-router";

import {
  useAuthStore,
} from "../store/authStore";
import {
  useProfileStore,
} from "../store/profileStore";
import { AppTheme } from "../constants/theme";

export default function ProfileScreen() {
  const user =
    useAuthStore(
      (state) => state.user
    );
  const logout =
    useAuthStore(
      (state) => state.logout
    );
  const profiles =
    useProfileStore(
      (state) => state.profiles
    );
  const activeProfile =
    useProfileStore(
      (state) =>
        state.activeProfile
    );
  const loadProfiles =
    useProfileStore(
      (state) =>
        state.loadProfiles
    );

  useEffect(() => {
    loadProfiles();
  }, []);

  const initials =
    user?.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "OU";

  const handleLogout = () => {
    Alert.alert(
      "Log out",
      "Sign out of this account?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Log out",
          style: "destructive",
          onPress: () => {
            logout();
            router.replace("/");
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={
        styles.content
      }
    >
      <Text style={styles.kicker}>
        Account
      </Text>
      <Text style={styles.title}>
        Profile
      </Text>

      <View style={styles.headerCard}>
        {user?.avatar ? (
          <Image
            source={{
              uri: user.avatar,
            }}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatarFallback}>
            <Text
              style={styles.avatarText}
            >
              {initials}
            </Text>
          </View>
        )}

        <View style={styles.identity}>
          <Text style={styles.name}>
            {user?.name ||
              "Signed in user"}
          </Text>
          <Text
            style={styles.email}
            numberOfLines={1}
          >
            {user?.email ||
              "Email unavailable"}
          </Text>
          <Text style={styles.plan}>
            {user?.subscription ||
              "free"}{" "}
            plan
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Watching Profile
        </Text>
        <TouchableOpacity
          style={styles.row}
          onPress={() =>
            router.push("/profiles")
          }
        >
          <View>
            <Text style={styles.rowTitle}>
              {activeProfile?.name ||
                "Choose profile"}
            </Text>
            <Text style={styles.rowMeta}>
              {profiles.length} profile
              {profiles.length === 1
                ? ""
                : "s"}{" "}
              on this device
            </Text>
          </View>
          <Text style={styles.chevron}>
            Open
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Library
        </Text>
        <Action
          title="Downloads"
          subtitle="Offline titles on this device"
          onPress={() =>
            router.push(
              "/(tabs)/downloads" as any
            )
          }
        />
        <Action
          title="Favorites"
          subtitle="Saved titles"
          onPress={() =>
            router.push("/favorites")
          }
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Wallet
        </Text>
        <Action
          title="Coin Wallet"
          subtitle="Balance and purchase history"
          onPress={() =>
            router.push("/wallet")
          }
        />
        <Action
          title="Coin Store"
          subtitle="Buy coins securely"
          onPress={() =>
            router.push("/coin-store")
          }
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Creator Studio
        </Text>
        <Action
          title="Dashboard"
          subtitle="Uploads, live streams, and earnings"
          onPress={() =>
            router.push(
              "/creator-dashboard"
            )
          }
        />
      </View>

      <TouchableOpacity
        style={styles.logout}
        onPress={handleLogout}
      >
        <Text style={styles.logoutText}>
          Log Out
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Action({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.78}
    >
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>
          {title}
        </Text>
        <Text
          style={styles.rowMeta}
          numberOfLines={2}
        >
          {subtitle}
        </Text>
      </View>
      <Text style={styles.chevron}>
        Open
      </Text>
    </TouchableOpacity>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        AppTheme.colors.background,
    },

    content: {
      padding: AppTheme.spacing.lg,
      paddingBottom: 110,
    },

    kicker: {
      color: AppTheme.colors.accent,
      fontSize: AppTheme.typography.kicker.fontSize,
      fontWeight: AppTheme.typography.kicker.fontWeight,
      letterSpacing: AppTheme.typography.kicker.letterSpacing,
      textTransform: "uppercase",
      marginTop: AppTheme.spacing.md,
    },

    title: {
      color: AppTheme.colors.text,
      fontSize: AppTheme.typography.display.fontSize,
      fontWeight: AppTheme.typography.display.fontWeight,
      marginTop: AppTheme.spacing.xs,
      marginBottom: AppTheme.spacing.xl,
    },

    headerCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: AppTheme.spacing.lg,
      backgroundColor: AppTheme.colors.surface,
      borderWidth: 1,
      borderColor: AppTheme.colors.borderSoft,
      borderRadius: AppTheme.radius.lg,
      padding: AppTheme.spacing.xl,
      marginBottom: AppTheme.spacing.xs,
    },

    avatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor:
        AppTheme.colors.surfaceSoft,
    },

    avatarFallback: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        AppTheme.colors.accentSoft,
    },

    avatarText: {
      color: AppTheme.colors.accent,
      fontSize: 22,
      fontWeight: "900",
    },

    identity: {
      flex: 1,
    },

    name: {
      color: AppTheme.colors.text,
      fontSize: 21,
      fontWeight: "900",
    },

    email: {
      color:
        AppTheme.colors.textMuted,
      marginTop: 5,
    },

    plan: {
      color: AppTheme.colors.accent,
      marginTop: 8,
      fontWeight: "800",
      textTransform: "capitalize",
    },

    section: {
      marginTop: AppTheme.spacing.xxl,
    },

    sectionTitle: {
      color: AppTheme.colors.text,
      fontSize: AppTheme.typography.heading.fontSize,
      fontWeight: AppTheme.typography.heading.fontWeight,
      marginBottom: AppTheme.spacing.md,
    },

    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: AppTheme.spacing.md,
      backgroundColor: AppTheme.colors.surface,
      borderWidth: 1,
      borderColor: AppTheme.colors.borderSoft,
      borderRadius: AppTheme.radius.md,
      padding: AppTheme.spacing.lg,
      marginBottom: AppTheme.spacing.sm,
    },

    rowCopy: {
      flex: 1,
    },

    rowTitle: {
      color: AppTheme.colors.text,
      fontSize: AppTheme.typography.subtitle.fontSize,
      fontWeight: AppTheme.typography.subtitle.fontWeight,
    },

    rowMeta: {
      color:
        AppTheme.colors.textSubtle,
      marginTop: 5,
      lineHeight: 19,
    },

    chevron: {
      color: AppTheme.colors.accent,
      fontWeight: "900",
    },

    logout: {
      minHeight: 54,
      alignItems: "center",
      justifyContent: "center",
      marginTop: AppTheme.spacing.xl,
      borderRadius: AppTheme.radius.md,
      backgroundColor: "rgba(225,91,100,0.14)",
      borderWidth: 1,
      borderColor: AppTheme.colors.danger,
    },

    logoutText: {
      color: AppTheme.colors.danger,
      fontWeight: "900",
    },
  });
