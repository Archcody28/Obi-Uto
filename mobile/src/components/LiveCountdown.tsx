import React, {
  useEffect,
  useState,
} from "react";

import {
  View,
  Text,
  StyleSheet,
} from "react-native";
import { AppTheme } from "../constants/theme";

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
    const update = () => {
      const target =
        new Date(
          scheduledFor
        ).getTime();

      const diff =
        target - Date.now();

      if (diff <= 0) {
        setTimeLeft("Live now");
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
            (1000 * 60)) /
            1000
        );

      setTimeLeft(
        `${days}d ${hours}h ${minutes}m ${seconds}s`
      );
    };

    update();

    const interval =
      setInterval(
        update,
        1000
      );

    return () =>
      clearInterval(
        interval
      );
  }, [scheduledFor]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {prefix}
      </Text>

      <Text style={styles.time}>
        {timeLeft}
      </Text>
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      marginBottom: 6,
    },

    label: {
      color: AppTheme.colors.accent,
      fontWeight: "800",
      fontSize: 12,
    },

    time: {
      color: AppTheme.colors.text,
      fontWeight: "800",
      fontSize: 15,
      marginTop: 2,
    },
  });
