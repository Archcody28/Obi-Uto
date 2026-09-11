import React, { useRef } from "react";
import { Animated, Image, TouchableOpacity } from "react-native";

const MediaCard = ({ item, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 1.08,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Image
          source={{ uri: item.thumbnail }}
          style={{
            width: 120,
            height: 180,
            borderRadius: 12,
          }}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

export default MediaCard;