import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

const MiniPlayer = ({ title, onExpand, isVisible }) => {
  if (!isVisible) return null;

  return (
    <View
      style={{
        position: "absolute",
        bottom: 0,
        width: "100%",
        height: 70,
        backgroundColor: "#111",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 15,
        borderTopWidth: 1,
        borderTopColor: "#333",
      }}
    >
      <Text style={{ color: "white" }}>{title}</Text>

      <TouchableOpacity onPress={onExpand}>
        <Text style={{ color: "#00f2ff" }}>Expand</Text>
      </TouchableOpacity>
    </View>
  );
};

export default MiniPlayer;