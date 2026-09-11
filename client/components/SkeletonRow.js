import React from "react";
import { View, Animated } from "react-native";

const SkeletonRow = () => {
  const shimmer = new Animated.Value(0);

  Animated.loop(
    Animated.sequence([
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(shimmer, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
    ])
  ).start();

  return (
    <View style={{ padding: 10 }}>
      <View
        style={{
          height: 20,
          width: 120,
          backgroundColor: "#222",
          marginBottom: 10,
          borderRadius: 4,
        }}
      />

      <View style={{ flexDirection: "row" }}>
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={{
              width: 120,
              height: 180,
              backgroundColor: "#222",
              marginRight: 10,
              borderRadius: 10,
            }}
          />
        ))}
      </View>
    </View>
  );
};

export default SkeletonRow;