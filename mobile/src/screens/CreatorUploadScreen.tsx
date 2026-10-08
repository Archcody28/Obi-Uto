import React, { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView } from "react-native";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { VideoView, useVideoPlayer } from "expo-video";
import { AppTheme } from "../constants/theme";
import { createContent } from "../api/creatorApi";
import { uploadFileWithProgress } from "../api/uploadApi";
const CATS = ["movie", "series", "music", "song", "podcast"];
const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: AppTheme.colors.background },
  body: { padding: 20 },
  kick: { color: AppTheme.colors.accent, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  h1: { color: AppTheme.colors.text, fontSize: 30, fontWeight: "900", marginTop: 4 },
  sub: { color: AppTheme.colors.textMuted, marginTop: 6, marginBottom: 16, lineHeight: 20 },
  card: { backgroundColor: AppTheme.colors.surface, borderColor: AppTheme.colors.border, borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 14 },
  lab: { color: AppTheme.colors.text, fontWeight: "800", marginTop: 10, marginBottom: 6 },
  inp: { backgroundColor: AppTheme.colors.input, color: AppTheme.colors.text, borderColor: AppTheme.colors.border, borderWidth: 1, borderRadius: 8, padding: 12 },
  multi: { minHeight: 90, textAlignVertical: "top" },
  vid: { width: "100%", height: 210, borderRadius: 10, backgroundColor: "#000" },
  thm: { width: "100%", height: 170, borderRadius: 10, backgroundColor: "#000" },
  meta: { color: AppTheme.colors.textSubtle, fontSize: 12, marginTop: 8 },
  rdy: { color: AppTheme.colors.success, fontWeight: "800", marginTop: 8 },
  bw: { marginTop: 10 },
  bar: { height: 8, borderRadius: 99, backgroundColor: AppTheme.colors.surfaceSoft, overflow: "hidden" },
  pct: { color: AppTheme.colors.textMuted, fontSize: 12, marginTop: 6 },
  pick: { borderWidth: 1, borderColor: AppTheme.colors.border, backgroundColor: AppTheme.colors.surface, borderRadius: 12, padding: 26, alignItems: "center", marginBottom: 14 },
  pt: { color: AppTheme.colors.text, fontWeight: "900", fontSize: 17 },
  ps: { color: AppTheme.colors.textSubtle, marginTop: 4 },
  gh: { backgroundColor: AppTheme.colors.surfaceSoft, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 8, marginTop: 10 },
  ght: { color: AppTheme.colors.text, fontWeight: "800", textAlign: "center" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: AppTheme.colors.border, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 8 },
  chipOn: { backgroundColor: AppTheme.colors.accent },
  chipT: { color: AppTheme.colors.textMuted, fontWeight: "800", textTransform: "capitalize" },
  chipTOn: { color: AppTheme.colors.background },
  err: { backgroundColor: "rgba(225,91,100,0.12)", borderWidth: 1, borderColor: AppTheme.colors.danger, borderRadius: 12, padding: 14, marginBottom: 14 },
  errT: { color: AppTheme.colors.text, fontWeight: "700" },
  ok: { backgroundColor: "rgba(79,178,134,0.12)", borderWidth: 1, borderColor: AppTheme.colors.success, borderRadius: 12, padding: 14, marginBottom: 14 },
  okT: { color: AppTheme.colors.success, fontWeight: "900", fontSize: 17 },
  okB: { color: AppTheme.colors.text, marginTop: 4 },
  pri: { backgroundColor: AppTheme.colors.accent, borderRadius: 10, padding: 16, marginTop: 4 },
  priT: { color: AppTheme.colors.background, textAlign: "center", fontWeight: "900", fontSize: 16 },
  dis: { opacity: 0.45 },
});
function fmtB(n) {
  if (!n || n <= 0) return "";
  if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
  return (n / 1048576).toFixed(1) + " MB";
}

export default function CreatorUploadScreen() {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("movie");
  const [genreText, setGenreText] = useState("Drama");
  const [video, setVideo] = useState(null);
  const [thumb, setThumb] = useState(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [thumbUrl, setThumbUrl] = useState("");
  const [videoPct, setVideoPct] = useState(0);
  const [thumbPct, setThumbPct] = useState(0);
  const [phase, setPhase] = useState("idle");
  const [error, setError] = useState("");
  const [published, setPublished] = useState(null);
  const videoCtl = useRef(null);
  const thumbCtl = useRef(null);
  const player = useVideoPlayer(video ? video.uri : null, function (p) { p.loop = true; });
  const busy = phase === "uploading" || phase === "publishing";
  const videoMeta = useMemo(function () {
    if (!video) return "";
    const b = [];
    if (video.name) b.push(video.name);
    if (video.size) b.push(fmtB(video.size));
    if (video.mimeType) b.push(video.mimeType);
    return b.join("  -  ");
  }, [video]);
  async function pickVideo() {
    if (busy) return;
    setError("");
    const r = await DocumentPicker.getDocumentAsync({ type: "video/*", copyToCacheDirectory: true });
    if (r.canceled) return;
    setVideo(r.assets[0]); setVideoUrl(""); setVideoPct(0); setPublished(null);
    if (phase === "success") setPhase("idle");
  }
  async function pickThumb() {
    if (busy) return;
    setError("");
    const r = await DocumentPicker.getDocumentAsync({ type: "image/*", copyToCacheDirectory: true });
    if (r.canceled) return;
    setThumb(r.assets[0]); setThumbUrl(""); setThumbPct(0); setPublished(null);
    if (phase === "success") setPhase("idle");
  }
  function cancelUploads() {
    try { if (videoCtl.current) videoCtl.current.cancel(); } catch (e) {}
    try { if (thumbCtl.current) thumbCtl.current.cancel(); } catch (e) {}
    setPhase("idle"); setError("Upload cancelled.");
  }


  async function doPublish() {
    if (busy) return;
    setError(""); setPublished(null);
    if (!title.trim()) { setError("Title is required."); return; }
    if (!video) { setError("Select a video file first."); return; }
    setPhase("uploading");
    try {
      let vUrl = videoUrl; let tUrl = thumbUrl;
      if (!vUrl) {
        setVideoPct(0);
        const c = uploadFileWithProgress(video, "video", { onProgress: function (p) { setVideoPct(p); } });
        videoCtl.current = c;
        const d = await c.promise;
        vUrl = d.url; setVideoUrl(vUrl); setVideoPct(100);
      }
      if (thumb && !tUrl) {
        setThumbPct(0);
        const c2 = uploadFileWithProgress(thumb, "thumbnail", { onProgress: function (p) { setThumbPct(p); } });
        thumbCtl.current = c2;
        const d2 = await c2.promise;
        tUrl = d2.url; setThumbUrl(tUrl); setThumbPct(100);
      }
      setPhase("publishing");
      const genre = genreText.split(",").map(function (g) { return g.trim(); }).filter(Boolean).slice(0, 5);
      const rec = await createContent({ title: title.trim(), description: description.trim(), type: category, genre: genre.length ? genre : ["General"], thumbnail: tUrl || "", banner: "", videoUrl: vUrl });
      setPublished(rec); setPhase("success");
      Alert.alert("Published", "Your video is live in Creator Studio and Home.");
    } catch (e) {
      setError((e && e.message) || "Publish failed. Please retry.");
      setPhase("error");
    }
  }
  return (
    <ScrollView style={[S.root, { paddingTop: insets.top }]} contentContainerStyle={[S.body, { paddingBottom: insets.bottom + 40 }]}>
      <Text style={S.kick}>Creator Studio</Text>
      <Text style={S.h1}>Upload video</Text>
      <Text style={S.sub}>Select video, preview it, add a thumbnail and metadata, then publish.</Text>
      {video ? (
        <View style={S.card}>
          <Text style={S.lab}>Video preview</Text>
          <VideoView player={player} style={S.vid} contentFit="contain" nativeControls />
          {!!videoMeta && <Text style={S.meta}>{videoMeta}</Text>}
          <Text style={S.pct}>{videoUrl ? "Video uploaded - ready" : (phase === "uploading" ? videoPct + "% uploading" : "Not uploaded yet")}</Text>
          <TouchableOpacity style={S.gh} onPress={pickVideo} disabled={busy}><Text style={S.ght}>Change video</Text></TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={S.pick} onPress={pickVideo} disabled={busy}><Text style={S.pt}>Select video</Text><Text style={S.ps}>MP4 / MOV up to 500MB</Text></TouchableOpacity>
      )}
      <TouchableOpacity style={S.pick} onPress={pickThumb} disabled={busy}><Text style={S.pt}>Select thumbnail</Text><Text style={S.ps}>JPG / PNG optional</Text></TouchableOpacity>
      {(thumb || thumbUrl) ? (<View style={S.card}><Text style={S.lab}>Thumbnail preview</Text><Image source={{ uri: (thumb && thumb.uri) || thumbUrl }} style={S.thm} resizeMode="cover" /><Text style={S.pct}>{thumbUrl ? "Thumbnail uploaded" : "Not uploaded yet"}</Text></View>) : null}
      <View style={S.card}>
        <Text style={S.lab}>Title *</Text>
        <TextInput style={S.inp} value={title} onChangeText={setTitle} placeholder="Give it a title" placeholderTextColor={AppTheme.colors.textSubtle} maxLength={200} editable={!busy} />
        <Text style={S.lab}>Description</Text>
        <TextInput style={[S.inp, S.multi]} value={description} onChangeText={setDescription} placeholder="What is this about?" placeholderTextColor={AppTheme.colors.textSubtle} multiline numberOfLines={4} maxLength={5000} editable={!busy} />
        <Text style={S.lab}>Category</Text>
        <View style={S.chips}>{CATS.map(function (c) { const on = c === category; return (<TouchableOpacity key={c} disabled={busy} onPress={function () { setCategory(c); }} style={[S.chip, on && S.chipOn]}><Text style={[S.chipT, on && S.chipTOn]}>{c}</Text></TouchableOpacity>); })}</View>
        <Text style={S.lab}>Genres (comma separated)</Text>
        <TextInput style={S.inp} value={genreText} onChangeText={setGenreText} placeholder="Drama, Action" placeholderTextColor={AppTheme.colors.textSubtle} editable={!busy} />
      </View>
      {!!error && (<View style={S.err}><Text style={S.errT}>{error}</Text></View>)}
      {phase === "success" && published ? (<View style={S.ok}><Text style={S.okT}>Published</Text><Text style={S.okB}>{(published && published.title) || title} is live.</Text><TouchableOpacity style={S.pri} onPress={function () { router.push("/creator-content"); }}><Text style={S.priT}>View my content</Text></TouchableOpacity></View>) : null}
      {phase !== "success" && (
        <View>
          <TouchableOpacity style={[S.pri, (!video || !title.trim() || busy) && S.dis]} onPress={doPublish} disabled={!video || !title.trim() || busy}>
            {busy ? <ActivityIndicator color={AppTheme.colors.background} /> : <Text style={S.priT}>{phase === "error" ? "Retry publish" : "Publish"}</Text>}
          </TouchableOpacity>
          {busy && (<TouchableOpacity style={S.gh} onPress={cancelUploads}><Text style={S.ght}>Cancel upload</Text></TouchableOpacity>)}
        </View>
      )}
    </ScrollView>
  );
}
