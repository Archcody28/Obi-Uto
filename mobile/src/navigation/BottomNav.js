import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

const BottomNav = ({ navigation }) => {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-around",
        backgroundColor: "#111",
        padding: 15,
      }}
    >
      <TouchableOpacity onPress={() => navigation.navigate("Home")}>
        <Text style={{ color: "#fff" }}>Home</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Search")}>
        <Text style={{ color: "#fff" }}>Search</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Downloads")}>
        <Text style={{ color: "#fff" }}>Downloads</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Profile")}>
        <Text style={{ color: "#fff" }}>Profile</Text>
      </TouchableOpacity>
    </View>
  );
};

export default BottomNav;