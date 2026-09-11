import React, {
  useEffect,
  useState,
} from "react";

import {
  View,
  Text,
  StyleSheet,
} from "react-native";

interface Props {
  scheduledFor: string | Date;
  prefix?: string;
}

export default function LiveCountdown({
  scheduledFor,
  prefix = "Starts in",
}: Props) {
  const [
    timeLeft,
    setTimeLeft,
  ] = useState("");

  useEffect(() => {
    const interval =
      setInterval(() => {
        const target =
          new Date(
            scheduledFor
          ).getTime();

        const now =
          Date.now();

        const diff =
          target - now;

        if (diff <= 0) {
          setTimeLeft(
            "🔴 LIVE NOW"
          );
          return;
        }

        const days =
          Math.floor(
            diff /
              (1000 *
                60 *
                60 *
                24)
          );

        const hours =
          Math.floor(
            (diff %
              (1000 *
                60 *
                60 *
                24)) /
              (1000 *
                60 *
                60)
          );

        const minutes =
          Math.floor(
            (diff %
              (1000 *
                60 *
                60)) /
              (1000 * 60)
          );

        const seconds =
          Math.floor(
            (diff %
              (1000 *
                60)) /
              1000
          );

        setTimeLeft(
          `${days}d ${hours}h ${minutes}m ${seconds}s`
        );
      }, 1000);

    return () =>
      clearInterval(
        interval
      );
  }, [scheduledFor]);

  return (
    <View
      style={
        styles.container
      }
    >
      <Text
        style={
          styles.label
        }
      >
        📅 Starts in
      </Text>

      <Text
        style={
          styles.time
        }
      >
        {timeLeft}
      </Text>
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      marginLeft: 10,
      marginBottom: 6,
    },

    label: {
      color: "#FFD54F",
      fontWeight: "700",
      fontSize: 12,
    },

    time: {
      color: "#FFF",
      fontWeight: "700",
      fontSize: 15,
      marginTop: 2,
    },
  });
