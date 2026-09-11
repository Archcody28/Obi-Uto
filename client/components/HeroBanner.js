import React from "react";
import { View, Text, ImageBackground } from "react-native";

const HeroBanner = ({ data }) => {
  if (!data) return null;

  return (
    <ImageBackground
      source={{ uri: data.banner }}
      style={{
        height: 250,
        justifyContent: "flex-end",
        padding: 20,
      }}
    >
      <Text style={{ color: "#fff", fontSize: 28, fontWeight: "bold" }}>
        {data.title}
      </Text>

      <Text style={{ color: "#ccc", marginTop: 5 }}>
        {data.description}
      </Text>
    </ImageBackground>
  );
};

export default HeroBanner;