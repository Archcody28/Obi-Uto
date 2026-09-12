import React, {
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  router,
} from "expo-router";

import {
  deleteContent,
  getMyUploads,
} from "../api/creatorApi";
import {
  notifyMe,
} from "../api/notificationApi";
import {
  useAuthStore,
} from "../store/authStore";
import { AppTheme } from "../constants/theme";

interface CreatorContent {
  _id: string;
  title: string;
  views?: number;
  likes?: number;
  isLive?: boolean;
  isScheduled?: boolean;
  maturityRating?: string;
  status?: string;
}

interface User {
  _id: string;
}

export default function CreatorContentScreen() {
  const [content, setContent] =
    useState<CreatorContent[]>([]);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");
  const user =
    useAuthStore(
      (state) => state.user
    ) as User | null;

  const loadContent =
    async () => {
      setError("");
      try {
        const data =
          await getMyUploads();

        setContent(data || []);
      } catch (err) {
        console.log(err);
        setError(
          "Unable to load your content."
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadContent();
  }, []);

  const handleNotify =
    async (
      streamId: string
    ) => {
      try {
        if (!user?._id) {
          Alert.alert(
            "Error",
            "Please log in first."
          );
          return;
        }

        await notifyMe(
          streamId
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

  const handleDelete =
    async (id: string) => {
      try {
        await deleteContent(id);

        setContent((items) =>
          items.filter(
            (item) =>
              item._id !== id
          )
        );

        Alert.alert(
          "Content deleted",
          "The title was removed from your studio."
        );
      } catch (err) {
        console.log(err);
        Alert.alert(
          "Delete failed",
          "Unable to remove this content."
        );
      }
    };

  if (loading) {
    return (
      <View style={styles.state}>
        <ActivityIndicator
          color={AppTheme.colors.accent}
        />
        <Text style={styles.stateText}>
          Loading content...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>
        Creator Studio
      </Text>
      <Text style={styles.title}>
        My Content
      </Text>

      {!!error && (
        <TouchableOpacity
          style={styles.errorCard}
          onPress={loadContent}
        >
          <Text style={styles.errorText}>
            {error}
          </Text>
          <Text style={styles.retryText}>
            Tap to retry
          </Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={content}
        keyExtractor={(item) =>
          item._id
        }
        contentContainerStyle={
          styles.list
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            Your uploads will appear here after you submit content.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardCopy}>
                <Text
                  style={styles.name}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
                <Text style={styles.stats}>
                  {item.views || 0} views  |  {item.likes || 0} likes
                </Text>
              </View>

              {!!item.status && (
                <Text style={styles.status}>
                  {item.status}
                </Text>
              )}
            </View>

            {item.isLive && (
              <Text style={styles.liveText}>
                LIVE
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
                <Text style={styles.notifyText}>
                  Notify Me
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.neutralBtn}
                onPress={() =>
                  router.push(
                    `/edit-content/${item._id}` as any
                  )
                }
              >
                <Text style={styles.btnText}>
                  Edit
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dangerBtn}
                onPress={() =>
                  handleDelete(
                    item._id
                  )
                }
              >
                <Text style={styles.btnText}>
                  Delete
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.neutralBtn}
                onPress={() =>
                  router.push(
                    `/content-stats/${item._id}` as any
                  )
                }
              >
                <Text style={styles.btnText}>
                  Statistics
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppTheme.colors.background,
    padding: 20,
  },

  kicker: {
    color: AppTheme.colors.accent,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    marginTop: 10,
  },

  title: {
    color: AppTheme.colors.text,
    fontSize: 30,
    fontWeight: "900",
    marginTop: 4,
    marginBottom: 18,
  },

  list: {
    paddingBottom: 96,
  },

  card: {
    backgroundColor: AppTheme.colors.surface,
    borderColor: AppTheme.colors.border,
    borderWidth: 1,
    padding: 16,
    borderRadius: AppTheme.radius.md,
    marginBottom: 12,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },

  cardCopy: {
    flex: 1,
  },

  name: {
    color: AppTheme.colors.text,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 23,
  },

  status: {
    color: AppTheme.colors.accent,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "capitalize",
  },

  stats: {
    color: AppTheme.colors.textSubtle,
    marginTop: 8,
    marginBottom: 15,
  },

  liveText: {
    alignSelf: "flex-start",
    color: AppTheme.colors.live,
    fontWeight: "900",
    marginBottom: 12,
  },

  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  neutralBtn: {
    minHeight: 42,
    justifyContent: "center",
    backgroundColor: AppTheme.colors.surfaceSoft,
    paddingHorizontal: 12,
    borderRadius: AppTheme.radius.sm,
  },

  dangerBtn: {
    minHeight: 42,
    justifyContent: "center",
    backgroundColor: "rgba(225,91,100,0.16)",
    borderColor: AppTheme.colors.danger,
    borderWidth: 1,
    paddingHorizontal: 12,
    borderRadius: AppTheme.radius.sm,
  },

  btnText: {
    color: AppTheme.colors.text,
    fontWeight: "900",
  },

  notifyBtn: {
    backgroundColor: AppTheme.colors.accent,
    padding: 10,
    borderRadius: AppTheme.radius.sm,
    marginBottom: 12,
  },

  notifyText: {
    color: AppTheme.colors.background,
    textAlign: "center",
    fontWeight: "900",
  },

  state: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppTheme.colors.background,
    padding: 24,
  },

  stateText: {
    color: AppTheme.colors.textMuted,
    marginTop: 10,
  },

  empty: {
    color: AppTheme.colors.textMuted,
    textAlign: "center",
    marginTop: 44,
    lineHeight: 21,
  },

  errorCard: {
    backgroundColor: "rgba(225,91,100,0.12)",
    borderColor: AppTheme.colors.danger,
    borderWidth: 1,
    borderRadius: AppTheme.radius.md,
    padding: 14,
    marginBottom: 16,
  },

  errorText: {
    color: AppTheme.colors.text,
    fontWeight: "800",
  },

  retryText: {
    color: AppTheme.colors.danger,
    marginTop: 4,
    fontWeight: "700",
  },
});
