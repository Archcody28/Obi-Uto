import React, {
  useEffect,
  useState,
} from "react";

import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
  Alert,
} from "react-native";

import {
  getForYou,
} from "../api/recommendationV2Api";

import { router } from "expo-router";

import ContinueWatchingRow from "../components/ContinueWatchingRow";
import HeroBanner from "../components/HeroBanner";
import MediaRow from "../components/MediaRow";
import MediaCard from "../components/MediaCard";

import {
  useProfileStore,
} from "../store/profileStore";

import {
  useMediaStore,
} from "../store/mediaStore";

import {
  getTrending,
  getSimilar,
  getRecommendations,
} from "../api/recommendationApi";

import {
  continueWatching,
} from "../api/watchApi";

import {
  notifyMe,
} from "../api/notificationApi";
import {
  useAuthStore,
} from "../store/authStore";

import LiveCountdown
from "../components/LiveCountdown";

import LiveNowRow from "../components/LiveNowRow"; 
import UpcomingLiveRow
from "../components/UpcomingLiveRow";

import {
  getDiscovery,
} from "../api/liveStreamApi";

export default function HomeScreen() {
  const activeProfile =
    useProfileStore(
      (state) =>
        state.activeProfile
    );

  const ratings = [
    "G",
    "PG",
    "PG-13",
    "16+",
    "18+",
  ];

 const filterContent = (items = []) => {
  if (!activeProfile) {
    return items;
  }

  const maxIndex =
    ratings.indexOf(activeProfile.maxRating);

  return items.filter((item) => {
    const ratingIndex =
      ratings.indexOf(
        item?.maturityRating ?? "18+"
      );

    return ratingIndex <= maxIndex;
  });
};

    const user =
  useAuthStore(
    (state) => state.user
  );

  const [
    recommendations,
    setRecommendations,
  ] = useState([]);

  const [
    trending,
    setTrending,
  ] = useState([]);

  const [
    similar,
    setSimilar,
  ] = useState([]);

  const [
    continueItems,
    setContinueItems,
  ] = useState([]);

  const {
    movies,
    series,
    music,
    podcasts,
    fetchMedia,
  } = useMediaStore();

  const [
    forYou,
    setForYou,
  ] = useState([]);

const [
discovery,
setDiscovery,
]=useState({
live:[],
upcoming:[],
});

  useEffect(() => {
    fetchMedia();
    loadRecommendations();
    loadContinueWatching();
    loadForYou();
    getDiscovery()
.then(res=>{

setDiscovery(
res.data
);

});
  }, []);

  const loadRecommendations =
    async () => {
      try {
        const trendingData =
          await getTrending();

        setTrending(
          trendingData
        );

        const similarData =
          await getSimilar();

        setSimilar(
          similarData
        );

        const recommendationsData =
          await getRecommendations();

        setRecommendations(
          recommendationsData
        );
      } catch (err) {
        console.log(err);
      }
    };

  const loadForYou =
    async () => {
      try {
        const data =
          await getForYou();

        setForYou(
          data
        );
      } catch (err) {
        console.log(err);
      }
    };

  const loadContinueWatching =
    async () => {
      try {
        const data =
          await continueWatching();

        setContinueItems(
          data
        );
      } catch (err) {
        console.log(err);
      }
    };

const handleNotify =
  async (streamId) => {
    try {

      if (!user?._id) {
  Alert.alert(
    "Login Required",
    "Please sign in first."
  );
  return;
}

if (!user) {
  Alert.alert(
    "Error",
    "Please log in first."
  );
  return;
}

await notifyMe(
  streamId,
  user._id
);

      Alert.alert(
        "Subscribed",
        "We'll notify you when the stream starts."
      );

    } catch (err) {

      console.log(err);

      Alert.alert(
        "Error",
        "Unable to subscribe."
      );

    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.profileText}>
        {activeProfile
          ? `Watching as ${activeProfile.name}`
          : "No Profile Selected"}
      </Text>

      <TouchableOpacity
        style={styles.favoritesBtn}
        onPress={() =>
          router.push("/favorites")
        }
      >
        <Text style={styles.favoritesText}>
          ⭐ Favorites
        </Text>
      </TouchableOpacity>

      <HeroBanner />
     {/* 🔴 LIVE NOW */}

<LiveNowRow
  streams={discovery.live}
/>

{discovery.live.length === 0 && (
  <Text
    style={{
      color: "#AAA",
      marginVertical: 20,
      marginHorizontal: 10,
    }}
  >
    No one is live right now.
  </Text>
)}

{/* 📅 UPCOMING */}

<UpcomingLiveRow
  streams={
    discovery.upcoming
  }
/>
      {/* 🔥 Trending */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>
          🔥 Trending
        </Text>

        <FlatList
          horizontal
          style={styles.horizontalList}
          data={filterContent(trending)}
          keyExtractor={(item) =>
            item._id
          }
          renderItem={({ item }) => (
            <View>
              {item.isLive && (
                <Text
                  style={{
                    color: "red",
                    fontWeight: "700",
                    marginLeft: 10,
                    marginBottom: 4,
                  }}
                >
                  🔴 LIVE
                </Text>
              )}

              <MediaCard item={item} />
            </View>
          )}
          showsHorizontalScrollIndicator={
            false
          }
        />
        
      </View>
           <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>
          ❤️ Because You Liked
        </Text>

        <FlatList
          horizontal
          style={styles.horizontalList}
          data={filterContent(similar)}
          keyExtractor={(item) =>
            item._id
          }
          renderItem={({ item }) => (
            <View>
              {item.isLive && (
                <Text
                  style={{
                    color: "red",
                    fontWeight: "700",
                    marginLeft: 10,
                    marginBottom: 4,
                  }}
                >
                  🔴 LIVE
                </Text>
              )}
              {item.isScheduled &&
!item.isLive && (
  <LiveCountdown
    scheduledFor={
      item.scheduledFor
    }
  />
)}

              <MediaCard item={item} />
            </View>
          )}
          showsHorizontalScrollIndicator={
            false
          }
        />
      </View>

      {/* 🤖 For You */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>
          🤖 For You
        </Text>

        {forYou.length > 0 ? (
          <FlatList
            horizontal
            style={styles.horizontalList}
            data={filterContent(forYou)}
            keyExtractor={(item) =>
              item._id
            }
            renderItem={({ item }) => (
  <View>
    {item.isLive && (
      <Text
        style={{
          color: "red",
          fontWeight: "700",
          marginLeft: 10,
          marginBottom: 4,
        }}
      >
        🔴 LIVE
      </Text>
    )}
    {item.isScheduled &&
!item.isLive && (
  <LiveCountdown
    scheduledFor={
      item.scheduledFor
    }
  />
)}

    {item.source?.includes("/live/") && (
      <Text
        style={{
          color: "#FF5555",
          fontWeight: "700",
          marginLeft: 10,
          marginBottom: 4,
        }}
      >
        🎥 LIVE REPLAY
      </Text>
    )}

    <MediaCard item={item} />
  </View>
)}
            showsHorizontalScrollIndicator={
              false
            }
          />
        ) : (
          <Text style={styles.emptyText}>
            No personalized recommendations yet.
          </Text>
        )}
      </View>

      {/* 🎬 Continue Watching */}
      {continueItems.length > 0 && (
        <View style={styles.sectionContainer}>
          <Text
            style={
              styles.sectionTitle
            }
          >
            🎬 Continue Watching
          </Text>

          <FlatList
            horizontal
            style={
              styles.horizontalList
            }
            data={
              continueItems
            }
            keyExtractor={(
              item
            ) =>
              item._id
            }
            renderItem={({ item }) => (
  <View>
    {item.isLive && (
      <Text
        style={{
          color: "red",
          fontWeight: "700",
          marginLeft: 10,
          marginBottom: 4,
        }}
      >
        🔴 LIVE
      </Text>
    )}

    {item.source?.includes("/live/") && (
      <Text
        style={{
          color: "#FF5555",
          fontWeight: "700",
          marginLeft: 10,
          marginBottom: 4,
        }}
      >
        🎥 LIVE REPLAY
      </Text>
    )}
{item.isScheduled &&
!item.isLive && (

<TouchableOpacity
  style={styles.notifyBtn}
  onPress={() =>
    handleNotify(item._id)
  }
>

<Text
  style={styles.notifyText}
>

🔔 Notify Me

</Text>

</TouchableOpacity>

)}
    <MediaCard item={item} />
  </View>
)}
      showsHorizontalScrollIndicator={
         false
            }
          />
        </View>
      )}

      {/* Existing Recommendation Section */}

      <MediaRow
        title="Recommended For You"
        data={filterContent(forYou)}
      />

      <MediaRow
        title="Movies"
        data={filterContent(
          movies
        )}
      />

      <MediaRow
        title="Because You Watched"
        data={filterContent(
          similar
        )}
      />

      <MediaRow
        title="Series"
        data={filterContent(
          series
        )}
      />

      <MediaRow
        title="Music"
        data={music}
      />

      <MediaRow
        title="Podcasts"
        data={podcasts}
      />
    </ScrollView>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        "#0D0D0D",
    },

    profileText: {
      color: "#fff",
      fontSize: 18,
      margin: 10,
    },

    sectionTitle: {
      color: "#fff",
      fontSize: 20,
      fontWeight: "700",
      marginHorizontal: 10,
      marginTop: 20,
      marginBottom: 10,
    },

    downloadBtn: {
      backgroundColor:
        "#6C5CE7",
      padding: 15,
      marginTop: 10,
      marginHorizontal: 16,
      borderRadius: 8,
    },

    favoritesBtn: {
      marginHorizontal: 10,
      marginTop: 10,
      marginBottom: 5,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: "#1F1F1F",
      borderRadius: 12,
    },

    favoritesText: {
      color: "#E84393",
      fontSize: 16,
      fontWeight: "700",
    },

    horizontalList: {
      paddingLeft: 10,
    },

    sectionContainer: {
      marginBottom: 15,
    },

    emptyText: {
      color: "#AAA",
      marginHorizontal: 10,
      marginBottom: 10,
      fontSize: 14,
    },
    notifyBtn: {
  backgroundColor: "#FF4444",
  padding: 10,
  borderRadius: 8,
  marginTop: 10,
},

notifyText: {
  color: "#FFF",
  textAlign: "center",
  fontWeight: "700",
},
  }); 
