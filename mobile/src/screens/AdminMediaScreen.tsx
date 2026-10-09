import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  deleteMedia,
  getAdminMedia,
  hideMedia,
  restoreMedia,
} from "../api/adminApi";
import { AppTheme } from "../constants/theme";
import { useAuthStore } from "../store/authStore";

export default function AdminMediaScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const isAdmin = !!(user && user.role === "admin");
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  const loadMedia = useCallback(async () => {
    if (!isAdmin) { setLoading(false); return; }
    try {
      setError("");
      const params = {} as Record<string, string>;
      if (filter === "hidden") params.hidden = "true";
      if (filter === "visible") params.hidden = "false";
      const data = await getAdminMedia({ ...params, limit: 30, page: 1 });
      const rows = (data && (data.media || data)) || [];
      setMedia(Array.isArray(rows) ? rows : []);
    } catch (e) {
      const code = e && e.response && e.response.status;
      setError(code === 401 ? "Sign in required." : code === 403 ? "Admin access required." : "Failed to load media.");
    } finally { setLoading(false); }
  }, [isAdmin, filter]);

  useEffect(() => { loadMedia(); }, [loadMedia]);

  const handleDelete = async (id) => {
    Alert.alert("Delete media", "Permanently delete this title? Prefer Hide for reversible moderation.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteMedia(id);
            loadMedia();
          } catch (e) { Alert.alert("Delete failed"); }
        },
      },
    ]);
  };

  const handleHide = async (id, hidden) => {
    Alert.alert(hidden ? "Restore media" : "Hide media", hidden ? "Make visible again?" : "Hide from all listings?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        style: hidden ? "default" : "destructive",
        onPress: async () => {
          try {
            if (hidden) await restoreMedia(id);
            else await hideMedia(id);
            loadMedia();
          } catch (e) { Alert.alert("Action failed"); }
        },
      },
    ]);
  };

  if (!isAdmin) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top + 40 }]}>
        <Text style={styles.title}>Restricted</Text>
        <Text style={styles.meta}>Admin access required.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={AppTheme.colors.accent} />
        <Text style={styles.meta}>Loading media…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
      {!!error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.tabs}>
        {["all", "visible", "hidden"].map((f) => (
          <TouchableOpacity key={f} style={[styles.tab, filter === f && styles.tabActive]} onPress={() => { setFilter(f); setLoading(true); }}>
            <Text style={[styles.tabText, filter === f && styles.tabTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={media}
        keyExtractor={(item) => String(item._id)}
        ListEmptyComponent={<Text style={styles.meta}>No media found.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.meta}>{item.type} · {item.status} · {item.isHidden ? "hidden" : "visible"}</Text>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => handleHide(item._id, item.isHidden)}>
                <Text style={styles.hide}>{item.isHidden ? "Restore" : "Hide"}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item._id)}>
                <Text style={styles.delete}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppTheme.colors.background, padding: 16 },
  center: { alignItems: "center", justifyContent: "center", gap: 10 },
  tabs: { flexDirection: "row", gap: 8, marginBottom: 12 },
  tab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: AppTheme.colors.surface, borderWidth: 1, borderColor: AppTheme.colors.borderSoft },
  tabActive: { borderColor: AppTheme.colors.accent },
  tabText: { color: AppTheme.colors.textMuted, fontWeight: "800", textTransform: "capitalize" },
  tabTextActive: { color: AppTheme.colors.accent },
  error: { color: AppTheme.colors.danger, marginBottom: 8 },
  card: { backgroundColor: AppTheme.colors.surface, borderWidth: 1, borderColor: AppTheme.colors.borderSoft, padding: 14, borderRadius: 12, marginBottom: 10 },
  title: { color: AppTheme.colors.text, fontSize: 17, fontWeight: "800" },
  meta: { color: AppTheme.colors.textMuted, fontSize: 12, marginTop: 6 },
  actions: { flexDirection: "row", gap: 16, marginTop: 10 },
  hide: { color: AppTheme.colors.accent, fontWeight: "800" },
  delete: { color: AppTheme.colors.danger, fontWeight: "800" },
});