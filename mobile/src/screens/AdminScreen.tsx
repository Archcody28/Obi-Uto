import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  createMedia,
  getAdminReport,
  getAdminReports,
  getAdminStats,
  hideMedia,
  restoreMedia,
  suspendAdminUser,
  unsuspendAdminUser,
  updateAdminReport,
  warnAdminUser,
} from "../api/adminApi";
import { router } from "expo-router";
import { AppTheme } from "../constants/theme";
import { useAuthStore } from "../store/authStore";

const STATUSES = ["open", "reviewing", "resolved", "dismissed"];

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const isAdmin = !!(user && user.role === "admin");
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [status, setStatus] = useState("open");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [warnText, setWarnText] = useState("");
  const [suspendReason, setSuspendReason] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  const load = useCallback(async () => {
    if (!isAdmin) { setLoading(false); return; }
    try {
      setError("");
      const s = await getAdminStats();
      const r = await getAdminReports({ status, limit: 20, page: 1 });
      setStats((s && s.stats) || null);
      setReports((r && r.reports) || []);
    } catch (e) {
      const code = e && e.response && e.response.status;
      setError(code === 401 ? "Sign in required." : code === 403 ? "Admin access required." : "Failed to load admin data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin, status]);

  useEffect(() => { load(); }, [load]);

  const openReport = async (id) => {
    try {
      setActionBusy(true);
      setFeedback("");
      const data = await getAdminReport(id);
      setSelected(data);
      setWarnText("");
      setSuspendReason("");
    } catch (e) { setFeedback("Failed to load report detail."); }
    finally { setActionBusy(false); }
  };

  const setReportStatus = async (next) => {
    if (!selected || !selected.report) return;
    const id = selected.report._id;
    Alert.alert("Update report", "Mark this report as " + next + "?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: async () => {
          try {
            setActionBusy(true);
            await updateAdminReport(id, { status: next });
            setFeedback("Report marked as " + next + ".");
            setSelected(null);
            load();
          } catch (e) { setFeedback("Failed to update report."); }
          finally { setActionBusy(false); }
        },
      },
    ]);
  };

  const toggleHide = async () => {
    if (!selected || !selected.report) return;
    const rep = selected.report;
    if (rep.targetType !== "media") { setFeedback("Hide/restore applies to media reports only."); return; }
    const hidden = !!(selected.target && selected.target.isHidden);
    Alert.alert(hidden ? "Restore media" : "Hide media", hidden ? "Make this title visible again?" : "Hide this title from all listings?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        style: hidden ? "default" : "destructive",
        onPress: async () => {
          try {
            setActionBusy(true);
            if (hidden) await restoreMedia(rep.targetId);
            else await hideMedia(rep.targetId);
            setFeedback(hidden ? "Media restored." : "Media hidden.");
            setSelected(null);
            load();
          } catch (e) { setFeedback("Media action failed."); }
          finally { setActionBusy(false); }
        },
      },
    ]);
  };

  const sendWarn = async () => {
    if (!selected || !selected.report) return;
    const rep = selected.report;
    if (rep.targetType !== "user") { setFeedback("Warn applies to user reports only."); return; }
    try {
      setActionBusy(true);
      await warnAdminUser(String(rep.targetId), warnText || undefined);
      setFeedback("Warning sent.");
      setWarnText("");
    } catch (e) { setFeedback("Failed to send warning."); }
    finally { setActionBusy(false); }
  };

  const toggleSuspend = async (suspend) => {
    if (!selected || !selected.report) return;
    const rep = selected.report;
    if (rep.targetType !== "user") { setFeedback("Suspend applies to user reports only."); return; }
    Alert.alert(suspend ? "Suspend user" : "Unsuspend user", suspend ? "Block this account from signing in?" : "Restore this account?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        style: suspend ? "destructive" : "default",
        onPress: async () => {
          try {
            setActionBusy(true);
            if (suspend) await suspendAdminUser(String(rep.targetId), suspendReason || undefined);
            else await unsuspendAdminUser(String(rep.targetId));
            setFeedback(suspend ? "User suspended." : "User unsuspended.");
            setSelected(null);
            load();
          } catch (e) { setFeedback("User action failed."); }
          finally { setActionBusy(false); }
        },
      },
    ]);
  };

  const handleUpload = async () => {
    try {
      await createMedia({ title, description, thumbnail, videoUrl, type: "movie" });
      Alert.alert("Media Uploaded");
      setTitle(""); setDescription(""); setThumbnail(""); setVideoUrl("");
    } catch (err) { Alert.alert("Upload failed"); }
  };

  if (!isAdmin) {
    return (
      <View style={[styles.center, { paddingTop: insets.top + 40 }]}>
        <Text style={styles.title}>Restricted</Text>
        <Text style={styles.muted}>Admin access required.</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.replace("/")}>
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={AppTheme.colors.accent} />
        <Text style={styles.muted}>Loading admin dashboard…</Text>
      </View>
    );
  }

  const cards = stats ? [
    { label: "Users", value: stats.totalUsers },
    { label: "Creators", value: stats.totalCreators },
    { label: "Media", value: stats.totalMedia },
    { label: "Published", value: stats.publishedMedia },
    { label: "Hidden", value: stats.hiddenMedia },
    { label: "Live now", value: stats.liveNow },
  ] : [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 120 + insets.bottom, paddingHorizontal: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={AppTheme.colors.accent} />}
    >
      <Text style={styles.kicker}>Platform oversight</Text>
      <Text style={styles.title}>Admin Dashboard</Text>
      {!!error && <Text style={styles.error}>{error}</Text>}
      {!!feedback && <Text style={styles.feedback}>{feedback}</Text>}
      <View style={styles.grid}>
        {cards.map((c) => (
          <View key={c.label} style={styles.card}>
            <Text style={styles.cardValue}>{String(c.value == null ? "—" : c.value)}</Text>
            <Text style={styles.cardLabel}>{c.label}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.sectionTitle}>Reports</Text>
      <View style={styles.tabs}>
        {STATUSES.map((s) => (
          <TouchableOpacity key={s} style={[styles.tab, status === s && styles.tabActive]} onPress={() => { setStatus(s); setLoading(true); }}>
            <Text style={[styles.tabText, status === s && styles.tabTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {reports.length === 0 ? (
        <Text style={styles.muted}>No {status} reports.</Text>
      ) : (
        reports.map((r) => (
          <TouchableOpacity key={r._id} style={styles.row} onPress={() => openReport(r._id)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{r.reason}</Text>
              <Text style={styles.rowMeta}>{r.targetType} · {r.status}</Text>
            </View>
            <Text style={styles.chevron}>Open</Text>
          </TouchableOpacity>
        ))
      )}

      {selected && selected.report && (
        <View style={styles.detail}>
          <Text style={styles.sectionTitle}>Report detail</Text>
          <Text style={styles.rowTitle}>{selected.report.reason}</Text>
          {!!selected.report.details && <Text style={styles.muted}>{selected.report.details}</Text>}
          <Text style={styles.rowMeta}>Target: {selected.report.targetType}</Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.button} disabled={actionBusy} onPress={() => setReportStatus("reviewing")}>
              <Text style={styles.buttonText}>Reviewing</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} disabled={actionBusy} onPress={() => setReportStatus("resolved")}>
              <Text style={styles.buttonText}>Resolve</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.ghost} disabled={actionBusy} onPress={() => setReportStatus("dismissed")}>
            <Text style={styles.ghostText}>Dismiss</Text>
          </TouchableOpacity>
          {selected.report.targetType === "media" && (
            <TouchableOpacity style={styles.warn} disabled={actionBusy} onPress={toggleHide}>
              <Text style={styles.buttonText}>{selected.target && selected.target.isHidden ? "Restore media" : "Hide media"}</Text>
            </TouchableOpacity>
          )}
          {selected.report.targetType === "user" && (
            <View>
              <TextInput style={styles.input} placeholder="Warning message" placeholderTextColor={AppTheme.colors.textSubtle} value={warnText} onChangeText={setWarnText} />
              <TouchableOpacity style={styles.button} disabled={actionBusy} onPress={sendWarn}>
                <Text style={styles.buttonText}>Send warning</Text>
              </TouchableOpacity>
              <TextInput style={styles.input} placeholder="Suspension reason" placeholderTextColor={AppTheme.colors.textSubtle} value={suspendReason} onChangeText={setSuspendReason} />
              <View style={styles.actions}>
                <TouchableOpacity style={styles.warn} disabled={actionBusy} onPress={() => toggleSuspend(true)}>
                  <Text style={styles.buttonText}>Suspend</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.ghost} disabled={actionBusy} onPress={() => toggleSuspend(false)}>
                  <Text style={styles.ghostText}>Unsuspend</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          <TouchableOpacity style={styles.ghost} onPress={() => setSelected(null)}>
            <Text style={styles.ghostText}>Close detail</Text>
          </TouchableOpacity>
        </View>
      )}
      <Text style={styles.sectionTitle}>Quick upload (legacy)</Text>
      <TextInput
        style={styles.input}
        placeholder="Title"
        value={title}
        onChangeText={setTitle}
      />

      <TextInput
        style={styles.input}
        placeholder="Description"
        value={description}
        onChangeText={
          setDescription
        }
      />

      <TextInput
        style={styles.input}
        placeholder="Thumbnail URL"
        value={thumbnail}
        onChangeText={
          setThumbnail
        }
      />

      <TextInput
        style={styles.input}
        placeholder="Video URL"
        value={videoUrl}
        onChangeText={
          setVideoUrl
        }
      />

      <TouchableOpacity
        style={styles.button}
        onPress={
          handleUpload
        }
      >
        <Text
          style={styles.buttonText}
        >
          Upload Media
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.button,
          {
            marginTop: 15,
          },
        ]}
        onPress={() =>
          router.push(
            "/admin-media"
          )
        }
      >
        <Text
          style={styles.buttonText}
        >
          Manage Media
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles =
  StyleSheet.create({
    container: { flex: 1, backgroundColor: AppTheme.colors.background },
    center: { flex: 1, backgroundColor: AppTheme.colors.background, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
    kicker: { color: AppTheme.colors.accent, fontSize: 11, fontWeight: "900", letterSpacing: 1.4, textTransform: "uppercase" },
    title: { color: AppTheme.colors.text, fontSize: 28, fontWeight: "900", marginBottom: 12 },
    muted: { color: AppTheme.colors.textMuted, marginTop: 8, lineHeight: 20 },
    error: { color: AppTheme.colors.danger, marginBottom: 8 },
    feedback: { color: AppTheme.colors.success, marginBottom: 8 },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginVertical: 12 },
    card: { flexGrow: 1, flexBasis: "30%", minWidth: 100, backgroundColor: AppTheme.colors.surface, borderWidth: 1, borderColor: AppTheme.colors.borderSoft, borderRadius: 12, padding: 12 },
    cardValue: { color: AppTheme.colors.text, fontSize: 22, fontWeight: "900" },
    cardLabel: { color: AppTheme.colors.textMuted, fontSize: 12, marginTop: 4, textTransform: "capitalize" },
    sectionTitle: { color: AppTheme.colors.text, fontSize: 18, fontWeight: "800", marginTop: 20, marginBottom: 10 },
    tabs: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
    tab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: AppTheme.colors.surface, borderWidth: 1, borderColor: AppTheme.colors.borderSoft },
    tabActive: { backgroundColor: AppTheme.colors.accentSoft, borderColor: AppTheme.colors.accent },
    tabText: { color: AppTheme.colors.textMuted, fontWeight: "800", textTransform: "capitalize" },
    tabTextActive: { color: AppTheme.colors.accent },
    row: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: AppTheme.colors.surface, borderWidth: 1, borderColor: AppTheme.colors.borderSoft, borderRadius: 12, padding: 12, marginBottom: 8 },
    rowTitle: { color: AppTheme.colors.text, fontSize: 15, fontWeight: "800" },
    rowMeta: { color: AppTheme.colors.textSubtle, fontSize: 12, marginTop: 4 },
    chevron: { color: AppTheme.colors.accent, fontWeight: "900" },
    detail: { marginTop: 12, backgroundColor: AppTheme.colors.surface, borderWidth: 1, borderColor: AppTheme.colors.borderSoft, borderRadius: 12, padding: 14, gap: 8 },
    actions: { flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" },
    input: { backgroundColor: AppTheme.colors.input, color: AppTheme.colors.text, padding: 14, borderRadius: 10, marginTop: 8, borderWidth: 1, borderColor: AppTheme.colors.borderSoft },
    button: { backgroundColor: "#6C5CE7", padding: 14, borderRadius: 10, alignItems: "center", marginTop: 8 },
    buttonText: { color: "#fff", textAlign: "center", fontWeight: "800" },
    ghost: { padding: 14, borderRadius: 10, alignItems: "center", marginTop: 8, borderWidth: 1, borderColor: AppTheme.colors.border },
    ghostText: { color: AppTheme.colors.text, fontWeight: "800" },
    warn: { backgroundColor: "rgba(225,91,100,0.85)", padding: 14, borderRadius: 10, alignItems: "center", marginTop: 8 },
  });