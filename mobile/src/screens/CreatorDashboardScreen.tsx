import React, {
  useEffect,
  useState,
} from "react";

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

import { router } from "expo-router";

import { getCreatorAnalytics } from "../api/analyticsApi";

export default function CreatorDashboardScreen() {
  const [analytics, setAnalytics] =
    useState(null);

  const creatorId =
    "YOUR_CREATOR_ID";

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics =
    async () => {
      try {
        const data =
          await getCreatorAnalytics(
            creatorId
          );

        setAnalytics(data);
      } catch (error) {
        console.log(error);
      }
    };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Creator Dashboard
      </Text>

      {/* Analytics Card */}
      <View style={styles.analyticsCard}>
        <Text style={styles.stat}>
          Views:{" "}
          {analytics?.totalViews ||
            0}
        </Text>

        <Text style={styles.stat}>
          Likes:{" "}
          {analytics?.totalLikes ||
            0}
        </Text>

        <Text style={styles.stat}>
          Comments:{" "}
          {analytics?.totalComments ||
            0}
        </Text>

        <Text style={styles.stat}>
          Followers:{" "}
          {analytics?.followers ||
            0}
        </Text>

        <Text style={styles.stat}>
          Revenue: ₦
          {analytics?.estimatedRevenue ||
            0}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          router.push(
            "/creator-upload"
          )
        }
      >
        <Text style={styles.cardText}>
          Upload Content
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          router.push(
            "/creator-content" as any
          )
        }
      >
        <Text style={styles.cardText}>
          Manage Content
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
      >
        <Text style={styles.cardText}>
          Analytics
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
      >
        <Text style={styles.cardText}>
          Earnings
        </Text>
      </TouchableOpacity>

<TouchableOpacity
  style={styles.card}
  onPress={() =>
    router.push(
      "/creator-live" as any
    )
  }
>
  <Text style={styles.cardTitle}>
    🎥 Live Streams
  </Text>

  <Text style={styles.cardSubtitle}>
    Schedule and manage live events
  </Text>
</TouchableOpacity>

    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        "#0D0D0D",
      padding: 20,
    },

    title: {
      color: "#fff",
      fontSize: 30,
      fontWeight: "700",
      marginBottom: 25,
    },

    analyticsCard: {
      backgroundColor:
        "#1A1A1A",
      padding: 20,
      borderRadius: 14,
      marginBottom: 20,
    },

    stat: {
      color: "#fff",
      fontSize: 16,
      marginBottom: 10,
    },

    card: {
      backgroundColor:
        "#1A1A1A",
      padding: 20,
      borderRadius: 14,
      marginBottom: 15,
    },

    cardText: {
      color: "#fff",
      fontSize: 18,
    },

    cardTitle: {
      color: "#fff",
      fontSize: 18,
      fontWeight: "700",
    },

    cardSubtitle: {
      color: "#AAA",
      marginTop: 6,
    },
  });
