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

import {
  getCreatorRevenue,
} from "../api/analyticsApi";
import {
  getMyCreatorProfile,
} from "../api/creatorApi";
import { AppTheme } from "../constants/theme";

export default function CreatorAnalyticsScreen() {
  const [data, setData] =
    useState<any>(null);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");

  const loadAnalytics =
    async () => {
      setError("");
      try {
        const creator =
          await getMyCreatorProfile();

        if (!creator?._id) {
          setData(null);
          return;
        }

        const revenue =
          await getCreatorRevenue(
            creator._id
          );

        setData(revenue);
      } catch (err) {
        console.error(err);
        setError(
          "Unable to load creator analytics."
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <View style={styles.state}>
        <ActivityIndicator
          color={AppTheme.colors.accent}
        />
        <Text style={styles.stateText}>
          Loading analytics...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>
        Creator Studio
      </Text>
      <Text style={styles.title}>
        Creator Analytics
      </Text>

      {!!error && (
        <TouchableOpacity
          style={styles.errorCard}
          onPress={loadAnalytics}
        >
          <Text style={styles.errorText}>
            {error}
          </Text>
          <Text style={styles.retryText}>
            Tap to retry
          </Text>
        </TouchableOpacity>
      )}

      <Metric
        label="Balance"
        value={`NGN ${data?.balance || 0}`}
      />
      <Metric
        label="Earned"
        value={`NGN ${data?.totalEarned || 0}`}
      />
      <Metric
        label="Withdrawn"
        value={`NGN ${data?.totalWithdrawn || 0}`}
      />
    </View>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>
        {label}
      </Text>
      <Text style={styles.value}>
        {value}
      </Text>
    </View>
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
    marginBottom: 22,
  },

  card: {
    backgroundColor: AppTheme.colors.surface,
    borderColor: AppTheme.colors.border,
    borderWidth: 1,
    borderRadius: AppTheme.radius.md,
    padding: 16,
    marginBottom: 12,
  },

  label: {
    color: AppTheme.colors.textMuted,
    fontWeight: "800",
  },

  value: {
    color: AppTheme.colors.text,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 6,
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
