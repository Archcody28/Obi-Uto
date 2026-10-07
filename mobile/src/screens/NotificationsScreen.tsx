import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  getNotifications,
  markAllRead,
  markRead,
  deleteNotification,
} from "../api/notificationApi";
import {
  openNotificationTarget,
} from "../utils/notificationNavigation";
import { AppTheme } from "../constants/theme";

type NotificationItem = {
  _id: string;
  title: string;
  message: string;
  type?: string;
  data?: Record<string, string | undefined>;
  read?: boolean;
  createdAt?: string;
};

function formatWhen(iso?: string) {
  if (!iso) {
    return "";
  }

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString();
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();

  const [
    items,
    setItems,
  ] = useState<NotificationItem[]>([]);
  const [
    loading,
    setLoading,
  ] = useState(true);
  const [
    error,
    setError,
  ] = useState("");
  const [
    busyId,
    setBusyId,
  ] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError("");
    setLoading(true);

    try {
      const response = await getNotifications();
      const payload = response?.data;

      if (Array.isArray(payload)) {
        setItems(payload);
      } else if (Array.isArray((payload as any)?.notifications)) {
        setItems((payload as any).notifications);
      } else {
        setItems([]);
      }
    } catch (err: any) {
      console.log("notifications load failed", err?.message);
      setError(
        "We could not load your notifications. Check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const unreadCount = items.filter(
    (item) => !item.read
  ).length;

  const handlePress = async (item: NotificationItem) => {
    // Navigate first so the tap feels instant, then persist read state.
    openNotificationTarget({
      type: item.type,
      streamId: item.data?.streamId,
      mediaId: item.data?.mediaId,
      creatorId: item.data?.creatorId,
    });

    if (item.read) {
      return;
    }

    setItems((prev) =>
      prev.map((candidate) =>
        candidate._id === item._id
          ? { ...candidate, read: true }
          : candidate
      )
    );

    try {
      await markRead(item._id);
    } catch (err: any) {
      console.log("markRead failed", err?.message);
      // Roll back optimistic read so the UI never lies about server state.
      setItems((prev) =>
        prev.map((candidate) =>
          candidate._id === item._id
            ? { ...candidate, read: false }
            : candidate
        )
      );
    }
  };

  const handleMarkAll = async () => {
    setItems((prev) =>
      prev.map((item) => ({ ...item, read: true }))
    );

    try {
      await markAllRead();
    } catch (err: any) {
      console.log("markAllRead failed", err?.message);
      load();
    }
  };

  const handleDelete = async (item: NotificationItem) => {
    if (busyId) {
      return;
    }

    const previous = items;
    setBusyId(item._id);
    setItems((prev) =>
      prev.filter(
        (candidate) => candidate._id !== item._id
      )
    );

    try {
      await deleteNotification(item._id);
    } catch (err: any) {
      console.log("deleteNotification failed", err?.message);
      setItems(previous);
      setError("We could not delete that notification.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop:
            AppTheme.spacing.lg + insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>Updates</Text>
          <Text style={styles.title}>
            Notifications
          </Text>
        </View>

        {!loading && unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllBtn}
            onPress={handleMarkAll}
            activeOpacity={0.78}
          >
            <Text style={styles.markAllText}>
              Mark all read
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {!!error && (
        <TouchableOpacity
          style={styles.errorCard}
          onPress={load}
        >
          <Text style={styles.error}>{error}</Text>
          <Text style={styles.retry}>
            Tap to retry
          </Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator
            color={AppTheme.colors.accent}
          />
          <Text style={styles.stateText}>
            Loading notifications...
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {error
                ? ""
                : "You are all caught up. New activity from creators, donations, and your account will show up here."}
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.card,
                !item.read && styles.cardUnread,
              ]}
              activeOpacity={0.78}
              onPress={() => handlePress(item)}
            >
              <View style={styles.cardCopy}>
                <View style={styles.cardHeadline}>
                  {!item.read && (
                    <View style={styles.dot} />
                  )}
                  <Text
                    style={[
                      styles.cardTitle,
                      !item.read && styles.cardTitleUnread,
                    ]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                </View>

                <Text
                  style={styles.cardMessage}
                  numberOfLines={3}
                >
                  {item.message}
                </Text>

                <View style={styles.metaRow}>
                  {!!item.type && (
                    <Text style={styles.metaTag}>
                      {item.type}
                    </Text>
                  )}
                  {!!formatWhen(item.createdAt) && (
                    <Text style={styles.metaWhen}>
                      {formatWhen(item.createdAt)}
                    </Text>
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => handleDelete(item)}
                disabled={busyId === item._id}
              >
                <Text style={styles.removeText}>
                  {busyId === item._id
                    ? "..."
                    : "Remove"}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppTheme.colors.background,
    padding: AppTheme.spacing.lg,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: AppTheme.spacing.md,
  },

  headerCopy: {
    flex: 1,
    minWidth: 0,
  },

  kicker: {
    color: AppTheme.colors.accent,
    fontSize: AppTheme.typography.kicker.fontSize,
    fontWeight: AppTheme.typography.kicker.fontWeight,
    letterSpacing:
      AppTheme.typography.kicker.letterSpacing,
    textTransform: "uppercase",
    marginTop: AppTheme.spacing.md,
  },

  title: {
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.display.fontSize,
    fontWeight: "900",
    marginTop: 4,
    marginBottom: AppTheme.spacing.xl,
  },

  markAllBtn: {
    minHeight: 40,
    justifyContent: "center",
    borderRadius: AppTheme.radius.sm,
    backgroundColor: AppTheme.colors.surfaceSoft,
    paddingHorizontal: 12,
    marginBottom: AppTheme.spacing.lg,
  },

  markAllText: {
    color: AppTheme.colors.accent,
    fontWeight: "800",
    fontSize: AppTheme.typography.label.fontSize,
  },

  list: {
    paddingBottom: 120,
    flexGrow: 1,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: AppTheme.spacing.md,
    backgroundColor: AppTheme.colors.surface,
    borderColor: AppTheme.colors.border,
    borderWidth: 1,
    padding: AppTheme.spacing.lg,
    borderRadius: AppTheme.radius.md,
    marginBottom: AppTheme.spacing.md,
  },

  cardUnread: {
    borderColor: AppTheme.colors.accentMuted,
    backgroundColor: AppTheme.colors.surfaceSoft,
  },

  cardCopy: {
    flex: 1,
    minWidth: 0,
  },

  cardHeadline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AppTheme.colors.accent,
  },

  cardTitle: {
    flex: 1,
    color: AppTheme.colors.textMuted,
    fontSize: AppTheme.typography.subtitle.fontSize,
    fontWeight: "700",
    lineHeight: 21,
  },

  cardTitleUnread: {
    color: AppTheme.colors.text,
    fontWeight: "900",
  },

  cardMessage: {
    color: AppTheme.colors.textMuted,
    fontSize: AppTheme.typography.body.fontSize,
    lineHeight: 21,
    marginTop: 4,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
    flexWrap: "wrap",
  },

  metaTag: {
    color: AppTheme.colors.accent,
    fontSize: AppTheme.typography.kicker.fontSize,
    fontWeight: "900",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },

  metaWhen: {
    color: AppTheme.colors.textSubtle,
    fontSize: 12,
  },

  removeBtn: {
    minHeight: 40,
    justifyContent: "center",
    borderRadius: AppTheme.radius.sm,
    backgroundColor: AppTheme.colors.surfaceSoft,
    paddingHorizontal: 12,
  },

  removeText: {
    color: AppTheme.colors.text,
    fontWeight: "800",
  },

  stateCard: {
    padding: 18,
    alignItems: "center",
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.lg,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },

  stateText: {
    color: AppTheme.colors.textMuted,
    marginTop: AppTheme.spacing.md,
  },

  empty: {
    color: AppTheme.colors.textMuted,
    textAlign: "center",
    marginTop: 44,
    lineHeight: 21,
    paddingHorizontal: AppTheme.spacing.lg,
  },

  errorCard: {
    backgroundColor: "rgba(225,91,100,0.12)",
    borderColor: AppTheme.colors.danger,
    borderWidth: 1,
    borderRadius: AppTheme.radius.md,
    padding: 14,
    marginBottom: 16,
  },

  error: {
    color: AppTheme.colors.text,
    fontWeight: "800",
  },

  retry: {
    color: AppTheme.colors.danger,
    marginTop: 4,
    fontWeight: "700",
  },
});

