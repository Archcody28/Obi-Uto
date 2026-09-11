import React from "react";
import { View, Text, ScrollView, Image } from "react-native";
import MediaCard from "./MediaCard";
const MediaRow = ({ title, data }) => {
  return (
    <View style={{ marginVertical: 15 }}>
      <Text style={{ color: "#fff", fontSize: 18, marginLeft: 10 }}>
        {title}
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {data.map((item) => (
          <View key={item._id} style={{ margin: 10 }}>
           <MediaCard item={item} onPress={() => {}} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

export default MediaRow;