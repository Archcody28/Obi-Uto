import React,
{
  useEffect,
} from "react";

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";

import {
  useRewardStore,
} from "../store/rewardStore";

export default function RewardScreen() {
  const {
    reward,
    loadRewards,
    claimReward,
  } =
    useRewardStore();

  useEffect(() => {
    loadRewards();
  }, []);

  const handleClaim =
    async () => {
      try {
        const result =
          await claimReward();

        Alert.alert(
          "Reward Claimed",
          `+${result.coinsAwarded} coins`
        );

        loadRewards();
      } catch (err) {
        Alert.alert(
          "Reward",
          err?.response?.data
            ?.message ||
            "Unable to claim"
        );
      }
    };

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
        🎁 Daily Rewards
      </Text>

      <Text
        style={
          styles.text
        }
      >
        Level:
        {" "}
        {
          reward?.level ||
          1
        }
      </Text>

      <Text
        style={
          styles.text
        }
      >
        Streak:
        {" "}
        {
          reward?.streakDays ||
          0
        }
        {" "}days
      </Text>

      <TouchableOpacity
        style={
          styles.button
        }
        onPress={
          handleClaim
        }
      >
        <Text
          style={
            styles.buttonText
          }
        >
          Claim Daily Reward
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
      justifyContent:
        "center",
    },

    title: {
      color: "#FFF",
      fontSize: 28,
      fontWeight: "700",
      marginBottom: 30,
    },

    text: {
      color: "#FFF",
      fontSize: 18,
      marginBottom: 15,
    },

    button: {
      backgroundColor:
        "#6C5CE7",
      padding: 15,
      borderRadius: 10,
    },

    buttonText: {
      color: "#FFF",
      textAlign:
        "center",
      fontWeight: "700",
    },
  });