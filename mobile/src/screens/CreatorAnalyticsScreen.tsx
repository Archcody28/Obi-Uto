import React,
{
  useEffect,
  useState,
} from "react";

import {
  View,
  Text,
  StyleSheet,
} from "react-native";

import {
  getCreatorRevenue,
} from "../api/analyticsApi";

export default function CreatorAnalyticsScreen() {
  const [
    data,
    setData,
  ] = useState(null);

  useEffect(() => {
    getCreatorRevenue(
      "CREATOR_ID"
    )
      .then(setData)
      .catch(console.error);
  }, []);

  if (!data) {
    return (
      <Text>
        Loading...
      </Text>
    );
  }

  return (
    <View
      style={
        styles.container
      }
    >
      <Text
        style={
          styles.title
        }
      >
        Creator Analytics
      </Text>

      <Text
        style={
          styles.card
        }
      >
        Balance:
        ₦
        {data.balance}
      </Text>

      <Text
        style={
          styles.card
        }
      >
        Earned:
        ₦
        {
          data.totalEarned
        }
      </Text>

      <Text
        style={
          styles.card
        }
      >
        Withdrawn:
        ₦
        {
          data.totalWithdrawn
        }
      </Text>
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
      fontSize: 24,
      fontWeight: "700",
      marginBottom: 20,
    },

    card: {
      color: "#fff",
      fontSize: 18,
      marginBottom: 12,
    },
  });