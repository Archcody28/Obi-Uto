import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { router } from "expo-router";

import {
  getForYou,
} from "../api/recommendationV2Api";
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
  getDiscovery,
} from "../api/liveStreamApi";
import HeroBanner from "../components/HeroBanner";
import MediaRow from "../components/MediaRow";
import LiveCountdown from "../components/LiveCountdown";
import LiveNowRow from "../components/LiveNowRow";
import {
  useAuthStore,
} from "../store/authStore";
import {
  useMediaStore,
} from "../store/mediaStore";
import {
  useProfileStore,
} from "../store/profileStore";
import { AppTheme } from "../constants/theme";

const ratings = [
  "G",
  "PG",
  "PG-13",
  "16+",
  "18+",
];

export default function HomeScreen() {
  const activeProfile =
    useProfileStore(
      (state) =>
        state.activeProfile
    );
  const user =
    useAuthStore(
      (state) => state.user
    );
  const {
    movies,
    series,
    music,
    podcasts,
    fetchMedia,
  } = useMediaStore();

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
  const [
    forYou,
    setForYou,
  ] = useState([]);
  const [
    discovery,
    setDiscovery,
  ] = useState({
    live: [],
    upcoming: [],
  });
  const [
    loading,
    setLoading,
  ] = useState(true);
  const [
    refreshing,
    setRefreshing,
  ] = useState(false);
  const [
    error,
    setError,
  ] = useState("");

  const filterContent = (
    items = []
  ) => {
    if (!activeProfile) {
      return items;
    }

    const maxIndex =
      ratings.indexOf(
        activeProfile.maxRating
      );

    if (maxIndex < 0) {
      return items;
    }

    return items.filter((item) => {
      const ratingIndex =
        ratings.indexOf(
          item?.maturityRating ??
            "18+"
        );

      return (
        ratingIndex === -1 ||
        ratingIndex <= maxIndex
      );
    });
  };

  const loadHome = async () => {
    setError("");

    try {
      await fetchMedia();

      const [
        trendingData,
        similarData,
        recommendationsData,
        continueData,
        forYouData,
        discoveryData,
      ] = await Promise.all([
        getTrending(),
        getSimilar(),
        getRecommendations(),
        continueWatching(),
        getForYou(),
        getDiscovery(),
      ]);

      setTrending(
        trendingData || []
      );
      setSimilar(
        similarData || []
      );
      setRecommendations(
        recommendationsData || []
      );
      setContinueItems(
        continueData || []
      );
      setForYou(
        forYouData || []
      );
      setDiscovery(
        discoveryData?.data || {
          live: [],
          upcoming: [],
        }
      );
    } catch (err) {
      console.log(err);
      setError(
        "We could not refresh your home feed."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadHome();
  }, []);

  const featured =
    useMemo(
      () =>
        filterContent(trending)[0] ||
        filterContent(forYou)[0] ||
        movies?.[0],
      [
        trending,
        forYou,
        movies,
        activeProfile,
      ]
    );

  const continueMedia =
    continueItems
      .map((item) =>
        item.media || item
      )
      .filter(Boolean);

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

        await notifyMe(
          streamId
        );

        Alert.alert(
          "You're on the list",
          "We'll notify you when the stream starts."
        );
      } catch (err) {
        console.log(err);
        Alert.alert(
          "Unable to subscribe",
          "Please try again."
        );
      }
    };

  const renderScheduledCard = ({
    item,
  }) => (
    <View style={styles.scheduledCard}>
      <LiveCountdown
        scheduledFor={
          item.scheduledFor
        }
      />
      <Text
        style={styles.scheduledTitle}
        numberOfLines={2}
      >
        {item.title}
      </Text>
      <TouchableOpacity
        style={styles.notifyBtn}
        onPress={() =>
          handleNotify(item._id)
        }
      >
        <Text style={styles.notifyText}>
          Notify Me
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={
        styles.content
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={
            AppTheme.colors.accent
          }
          onRefresh={() => {
            setRefreshing(true);
            loadHome();
          }}
        />
      }
    >
      <View style={styles.topbar}>
        <View>
          <Text style={styles.kicker}>
            Obi-Uto
          </Text>
          <Text style={styles.title}>
            For your night in
          </Text>
        </View>

        <TouchableOpacity
          style={styles.profilePill}
          onPress={() =>
            router.push("/profiles")
          }
        >
          <Text
            style={styles.profileText}
            numberOfLines={1}
          >
            {activeProfile?.name ||
              user?.name ||
              "Profile"}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator
            color={
              AppTheme.colors.accent
            }
          />
          <Text style={styles.stateText}>
            Curating your feed...
          </Text>
        </View>
      ) : (
        <>
          {!!error && (
            <View style={styles.stateCard}>
              <Text style={styles.stateText}>
                {error}
              </Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={loadHome}
              >
                <Text
                  style={styles.retryText}
                >
                  Retry
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <HeroBanner item={featured} />

          <View style={styles.quickRow}>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() =>
                router.push("/favorites")
              }
            >
              <Text style={styles.quickText}>
                Favorites
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAction}
              onPress={() =>
                router.push(
                  "/coin-store"
                )
              }
            >
              <Text style={styles.quickText}>
                Coin Store
              </Text>
            </TouchableOpacity>
          </View>

          <LiveNowRow
            streams={discovery.live}
          />

          {!!discovery.upcoming
            ?.length ? (
            <View>
              <Text style={styles.sectionTitle}>
                Upcoming Live
              </Text>
              <FlatList
                horizontal
                data={discovery.upcoming}
                keyExtractor={(item) =>
                  item._id
                }
                showsHorizontalScrollIndicator={
                  false
                }
                contentContainerStyle={
                  styles.scheduledList
                }
                renderItem={
                  renderScheduledCard
                }
              />
            </View>
          ) : (
            <Text style={styles.emptyText}>
              No upcoming live events.
            </Text>
          )}

          <MediaRow
            title="Trending"
            data={filterContent(
              trending
            )}
          />

          <MediaRow
            title="For You"
            data={filterContent(
              forYou
            )}
          />

          <MediaRow
            title="Continue Watching"
            data={filterContent(
              continueMedia
            )}
          />

          <MediaRow
            title="Recommended"
            data={filterContent(
              recommendations
            )}
          />

          <MediaRow
            title="Because You Watched"
            data={filterContent(
              similar
            )}
          />

          <MediaRow
            title="Movies"
            data={filterContent(
              movies
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
        </>
      )}
    </ScrollView>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        AppTheme.colors.background,
    },

    content: {
      paddingTop: AppTheme.spacing.lg,
      paddingBottom: 96,
    },

    topbar: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
      paddingHorizontal: AppTheme.spacing.lg,
      marginBottom: AppTheme.spacing.sm,
    },

    kicker: {
      color: AppTheme.colors.accent,
      fontSize: AppTheme.typography.kicker.fontSize,
      fontWeight: AppTheme.typography.kicker.fontWeight,
      letterSpacing: AppTheme.typography.kicker.letterSpacing,
      textTransform: "uppercase",
    },

    title: {
      color: AppTheme.colors.text,
      fontSize: AppTheme.typography.title.fontSize,
      fontWeight: AppTheme.typography.title.fontWeight,
      marginTop: AppTheme.spacing.xs,
    },

    profilePill: {
      maxWidth: 128,
      minHeight: 44,
      justifyContent: "center",
      backgroundColor:
        AppTheme.colors.surface,
      borderColor:
        AppTheme.colors.border,
      borderWidth: 1,
      borderRadius:
        AppTheme.radius.md,
      paddingHorizontal: 12,
    },

    profileText: {
      color: AppTheme.colors.text,
      fontWeight: "800",
    },

    quickRow: {
      flexDirection: "row",
      gap: AppTheme.spacing.md,
      paddingHorizontal: AppTheme.spacing.lg,
      marginBottom: AppTheme.spacing.xl,
    },

    quickAction: {
      flex: 1,
      minHeight: 50,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: AppTheme.colors.surface,
      borderRadius: AppTheme.radius.md,
      borderWidth: 1,
      borderColor: AppTheme.colors.borderSoft,
    },

    quickText: {
      color: AppTheme.colors.text,
      fontWeight: "800",
    },

    stateCard: {
      margin: AppTheme.spacing.lg,
      padding: AppTheme.spacing.xl,
      alignItems: "center",
      backgroundColor: AppTheme.colors.surface,
      borderRadius: AppTheme.radius.lg,
      borderWidth: 1,
      borderColor: AppTheme.colors.borderSoft,
    },

    stateText: {
      color:
        AppTheme.colors.textMuted,
      marginTop: 10,
      textAlign: "center",
    },

    retryBtn: {
      marginTop: 14,
      backgroundColor:
        AppTheme.colors.accent,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius:
        AppTheme.radius.sm,
    },

    retryText: {
      color:
        AppTheme.colors.background,
      fontWeight: "900",
    },

    scheduledList: {
      paddingLeft: 16,
      paddingRight: 2,
      marginBottom: 24,
    },

    sectionTitle: {
      color: AppTheme.colors.text,
      fontSize: AppTheme.typography.heading.fontSize,
      fontWeight: AppTheme.typography.heading.fontWeight,
      marginHorizontal: AppTheme.spacing.lg,
      marginBottom: AppTheme.spacing.md,
    },

    emptyText: {
      color: AppTheme.colors.textSubtle,
      marginHorizontal: AppTheme.spacing.lg,
      marginBottom: AppTheme.spacing.xl,
    },

    scheduledCard: {
      width: 200,
      marginRight: AppTheme.spacing.md,
      padding: AppTheme.spacing.lg,
      borderRadius: AppTheme.radius.lg,
      backgroundColor: AppTheme.colors.surface,
      borderColor: AppTheme.colors.borderSoft,
      borderWidth: 1,
    },

    scheduledTitle: {
      color: AppTheme.colors.text,
      fontWeight: "800",
      fontSize: 16,
      lineHeight: 21,
      marginVertical: 10,
    },

    notifyBtn: {
      backgroundColor:
        AppTheme.colors.accent,
      paddingVertical: 10,
      borderRadius:
        AppTheme.radius.sm,
      alignItems: "center",
    },

    notifyText: {
      color:
        AppTheme.colors.background,
      fontWeight: "900",
    },
  });
