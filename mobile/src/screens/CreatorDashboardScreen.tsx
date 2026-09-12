import React, {
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { router } from "expo-router";

import {
  getCreatorAnalytics,
} from "../api/analyticsApi";
import {
  getMyCreatorProfile,
} from "../api/creatorApi";
import { AppTheme } from "../constants/theme";

export default function CreatorDashboardScreen() {
  const [
    creator,
    setCreator,
  ] = useState<any>(null);
  const [
    analytics,
    setAnalytics,
  ] = useState<any>(null);
  const [
    loading,
    setLoading,
  ] = useState(true);
  const [
    error,
    setError,
  ] = useState("");

  const loadDashboard =
    async () => {
      setLoading(true);
      setError("");

      try {
        const profile =
          await getMyCreatorProfile();

        setCreator(profile);

        if (profile?._id) {
          const data =
            await getCreatorAnalytics(
              profile._id
            );
          setAnalytics(data);
        }
      } catch (err) {
        console.log(err);
        setError(
          "Unable to load creator dashboard."
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <View style={styles.state}>
        <ActivityIndicator
          color={AppTheme.colors.accent}
        />
        <Text style={styles.stateText}>
          Loading studio...
        </Text>
      </View>
    );
  }

  if (!creator) {
    return (
      <View style={styles.container}>
        <Text style={styles.kicker}>
          Creator Studio
        </Text>
        <Text style={styles.title}>
          Set up your creator profile.
        </Text>
        <Text style={styles.copy}>
          Creator tools require an account linked to your signed-in user.
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() =>
            router.push("/create-creator" as any)
          }
        >
          <Text style={styles.primaryText}>
            Become a Creator
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>
        Creator Studio
      </Text>
      <Text style={styles.title}>
        {creator.displayName ||
          "Dashboard"}
      </Text>

      {!!error && (
        <TouchableOpacity
          style={styles.errorCard}
          onPress={loadDashboard}
        >
          <Text style={styles.errorText}>
            {error}
          </Text>
          <Text style={styles.retryText}>
            Tap to retry
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.analyticsCard}>
        <Metric
          label="Views"
          value={analytics?.totalViews || 0}
        />
        <Metric
          label="Likes"
          value={analytics?.totalLikes || 0}
        />
        <Metric
          label="Comments"
          value={analytics?.totalComments || 0}
        />
        <Metric
          label="Followers"
          value={
            analytics?.followers ||
            creator.followers ||
            0
          }
        />
      </View>

      <Action
        title="Upload Content"
        subtitle="Submit a new title for review"
        onPress={() =>
          router.push("/creator-upload" as any)
        }
      />
      <Action
        title="Manage Content"
        subtitle="Edit, review, and remove your uploads"
        onPress={() =>
          router.push("/creator-content" as any)
        }
      />
      <Action
        title="Live Streams"
        subtitle="Create and manage live events"
        onPress={() =>
          router.push("/creator-live" as any)
        }
      />
    </View>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>
        {value}
      </Text>
      <Text style={styles.metricLabel}>
        {label}
      </Text>
    </View>
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
      style={styles.card}
      activeOpacity={0.78}
      onPress={onPress}
    >
      <View style={styles.cardCopy}>
        <Text style={styles.cardTitle}>
          {title}
        </Text>
        <Text style={styles.cardSubtitle}>
          {subtitle}
        </Text>
      </View>
      <Text style={styles.openText}>
        Open
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppTheme.colors.background,
    padding: 20,
  },

  kicker: {
    color: AppTheme.colors.accent,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    marginTop: 10,
  },

  title: {
    color: AppTheme.colors.text,
    fontSize: 30,
    fontWeight: "900",
    marginTop: 4,
    marginBottom: 20,
  },

  copy: {
    color: AppTheme.colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 22,
  },

  analyticsCard: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    backgroundColor: AppTheme.colors.surface,
    borderColor: AppTheme.colors.border,
    borderWidth: 1,
    borderRadius: AppTheme.radius.lg,
    padding: 14,
    marginBottom: 18,
  },

  metric: {
    width: "47%",
    backgroundColor: AppTheme.colors.surfaceSoft,
    borderRadius: AppTheme.radius.md,
    padding: 14,
  },

  metricValue: {
    color: AppTheme.colors.text,
    fontSize: 22,
    fontWeight: "900",
  },

  metricLabel: {
    color: AppTheme.colors.textSubtle,
    marginTop: 4,
    fontWeight: "700",
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: AppTheme.colors.surface,
    borderColor: AppTheme.colors.border,
    borderWidth: 1,
    borderRadius: AppTheme.radius.md,
    padding: 16,
    marginBottom: 12,
  },

  cardCopy: {
    flex: 1,
  },

  cardTitle: {
    color: AppTheme.colors.text,
    fontSize: 17,
    fontWeight: "900",
  },

  cardSubtitle: {
    color: AppTheme.colors.textMuted,
    marginTop: 5,
    lineHeight: 19,
  },

  openText: {
    color: AppTheme.colors.accent,
    fontWeight: "900",
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

  state: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppTheme.colors.background,
    padding: 24,
  },

  stateText: {
    color: AppTheme.colors.textMuted,
    marginTop: 10,
  },

  errorCard: {
    backgroundColor: "rgba(225,91,100,0.12)",
    borderColor: AppTheme.colors.danger,
    borderWidth: 1,
    borderRadius: AppTheme.radius.md,
    padding: 14,
    marginBottom: 16,
  },

  errorText: {
    color: AppTheme.colors.text,
    fontWeight: "800",
  },

  retryText: {
    color: AppTheme.colors.danger,
    marginTop: 4,
    fontWeight: "700",
  },
});
