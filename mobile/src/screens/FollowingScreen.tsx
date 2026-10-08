import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { getMyFollows, unfollowCreator } from "../api/followApi";
import { AppTheme } from "../constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function FollowingScreen() {
  const insets = useSafeAreaInsets();
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getMyFollows();
      setCreators(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || "We could not load creators you follow.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUnfollow = async (creatorId: string) => {
    const previous = creators;
    setBusyId(creatorId);
    setCreators((prev) => prev.filter((c) => String(c._id || c.id) !== String(creatorId)));
    try {
      await unfollowCreator(creatorId);
    } catch {
      setCreators(previous);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: AppTheme.spacing.lg + insets.top, paddingBottom: insets.bottom }]}>
      <Text style={styles.kicker}>Library</Text>
      <Text style={styles.title}>Following</Text>
      {!!error && (
        <TouchableOpacity style={styles.errorCard} onPress={load}>
          <Text style={styles.error}>{error}</Text>
          <Text style={styles.retry}>Tap to retry</Text>
        </TouchableOpacity>
      )}
      {loading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator color={AppTheme.colors.accent} />
          <Text style={styles.stateText}>Loading followed creators...</Text>
        </View>
      ) : (
        <FlatList
          data={creators}
          keyExtractor={(item, index) => String(item._id || item.id || index)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={!error ? (<Text style={styles.empty}>You are not following any creators yet. Open a creator profile and tap Follow.</Text>) : null}
          renderItem={({ item }) => {
            const id = String(item._id || item.id);
            return (
              <TouchableOpacity style={styles.card} activeOpacity={0.78} onPress={() => router.push({ pathname: "/creator-profile" as any, params: { creatorId: id } })}>
                <View style={styles.cardCopy}>
                  <Text style={styles.name} numberOfLines={2}>{item.displayName || item.name || "Creator"}</Text>
                  <Text style={styles.meta}>{typeof item.followers === "number" ? `${item.followers} followers` : "Creator"}</Text>
                </View>
                <TouchableOpacity style={styles.removeBtn} disabled={busyId === id} onPress={() => handleUnfollow(id)}>
                  <Text style={styles.removeText}>{busyId === id ? "..." : "Unfollow"}</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppTheme.colors.background, padding: AppTheme.spacing.lg },
  kicker: { color: AppTheme.colors.accent, fontSize: 12, fontWeight: "900", letterSpacing: 1.2, textTransform: "uppercase", marginTop: 8 },
  title: { color: AppTheme.colors.text, fontSize: 28, fontWeight: "900", marginTop: 4, marginBottom: 20 },
  list: { paddingBottom: 96 },
  card: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: AppTheme.colors.surface, borderColor: AppTheme.colors.border, borderWidth: 1, padding: 16, borderRadius: 10, marginBottom: 10, gap: 10 },
  cardCopy: { flex: 1 },
  name: { color: AppTheme.colors.text, fontSize: 16, fontWeight: "800", lineHeight: 21 },
  meta: { color: AppTheme.colors.textSubtle, marginTop: 5, fontSize: 12 },
  removeBtn: { minHeight: 40, justifyContent: "center", borderRadius: 8, backgroundColor: AppTheme.colors.surfaceSoft, paddingHorizontal: 12 },
  removeText: { color: AppTheme.colors.text, fontWeight: "800" },
  stateCard: { padding: 18, alignItems: "center", backgroundColor: AppTheme.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: AppTheme.colors.border },
  stateText: { color: AppTheme.colors.textMuted, marginTop: 10 },
  empty: { color: AppTheme.colors.textMuted, textAlign: "center", marginTop: 44, lineHeight: 21 },
  errorCard: { backgroundColor: "rgba(225,91,100,0.12)", borderColor: AppTheme.colors.danger, borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 16 },
  error: { color: AppTheme.colors.text, fontWeight: "800" },
  retry: { color: AppTheme.colors.danger, marginTop: 4, fontWeight: "700" },
});
