import React, { useEffect, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { fetchHomeFeed } from "../api/homeApi";

import HeroBanner from "../components/HeroBanner";
import MediaRow from "../components/MediaRow";

const HomeScreen = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    const token = "YOUR_TOKEN_HERE";
    setLoading(true);
    const res = await fetchHomeFeed(token);
    setData(res);
    setLoading(false);
  };

  if (loading) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#000" }}>
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
    </ScrollView>
  );
}

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#000" }}>

      {/* HERO */}
      <HeroBanner data={data.trending[0]} />

      {/* TRENDING */}
      <MediaRow title="Trending Now" data={data.trending} />

      {/* RECOMMENDED */}
      <MediaRow title="Recommended For You" data={data.recommended} />

      {/* LATEST */}
      <MediaRow title="New Releases" data={data.latest} />

    </ScrollView>
  );
};

export default HomeScreen;