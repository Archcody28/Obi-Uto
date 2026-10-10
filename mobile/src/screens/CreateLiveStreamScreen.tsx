import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { router } from "expo-router";

import {
  createStream,
  endOwnStream,
  getMyStreams,
} from "../api/liveStreamApi";
import { AppTheme } from "../constants/theme";

/*
 * Phase 29 — Creator Live Studio.
 *
 * Creating a stream does NOT start broadcasting. The phone cannot publish
 * to RTMP directly; the creator streams from OBS (or any RTMP encoder)
 * using the server URL + stream key shown here. The stream flips to LIVE
 * automatically when ingest receives the broadcast.
 */

const CATEGORIES = [
  "General",
  "Movies",
  "Music",
  "Gaming",
  "Podcasts",
  "Chat",
];

function formatTime(value?: string | null) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "";
  }
}

export function streamStatusOf(stream: any): {
  label: string;
  color: string;
} {
  if (stream?.isLive) {
    return { label: "LIVE", color: AppTheme.colors.live };
  }
  if (stream?.endedAt) {
    return { label: "ENDED", color: AppTheme.colors.textMuted };
  }
  if (stream?.isScheduled && stream?.scheduledFor) {
    return { label: "SCHEDULED", color: AppTheme.colors.accent };
  }
  return { label: "WAITING", color: AppTheme.colors.warning || "#E0A100" };
}

export default function CreateLiveStreamScreen() {
  const [streams, setStreams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [thumbnail, setThumbnail] = useState("");
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const mountedRef = useRef(true);

  const loadStreams = useCallback(async () => {
    try {
      const data = await getMyStreams();
      if (!mountedRef.current) return;
      setStreams(Array.isArray(data) ? data : []);
      setError("");
    } catch (err: any) {
      if (!mountedRef.current) return;
      setError(
        err?.response?.data?.message ||
          "Unable to load your streams."
      );
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadStreams();

    // Poll so the studio reflects real ingest state (RTMP -> live -> ended).
    const timer = setInterval(loadStreams, 5000);

    return () => {
      mountedRef.current = false;
      clearInterval(timer);
    };
  }, [loadStreams]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStreams();
    setRefreshing(false);
  };

  const submit = async () => {
    if (!title.trim()) {
      Alert.alert(
        "Title required",
        "Name your live stream before creating it."
      );
      return;
    }

    setCreating(true);
    try {
      const result = await createStream({
        title: title.trim(),
        description: description.trim(),
        category,
        thumbnail: thumbnail.trim(),
      });

      const created = result?.stream;

      setTitle("");
      setDescription("");
      setThumbnail("");

      await loadStreams();

      if (created?._id) {
        setExpandedId(String(created._id));
      }

      Alert.alert(
        "Stream created — not broadcasting yet",
        result?.message ||
          "Your stream is waiting. Use the RTMP server URL and stream key below in OBS to start broadcasting."
      );
    } catch (err: any) {
      Alert.alert(
        "Unable to create stream",
        err?.response?.data?.message || "Please try again."
      );
    } finally {
      setCreating(false);
    }
  };

  const shareValue = async (label: string, value: string) => {
    try {
      await Share.share({ message: `${label}: ${value}` });
    } catch {
      /* user dismissed */
    }
  };

  const endStream = (stream: any) => {
    Alert.alert(
      "End stream?",
      `"${stream.title}" will be marked as ended and viewers will be notified.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End stream",
          style: "destructive",
          onPress: async () => {
            try {
              await endOwnStream(stream._id);
              await loadStreams();
            } catch (err: any) {
              Alert.alert(
                "Unable to end stream",
                err?.response?.data?.message || "Please try again."
              );
            }
          },
        },
      ]
    );
  };

  const previewStream = (stream: any) => {
    if (!stream?.playbackUrl) {
      Alert.alert(
        "Not available yet",
        "Playback becomes available once your broadcast reaches the server."
      );
      return;
    }

    router.push({
      pathname: "/player",
      params: {
        mediaId: stream._id,
        streamId: stream._id,
        creatorId:
          typeof stream.creatorId === "object"
            ? stream.creatorId?._id
            : stream.creatorId,
        videoUrl: stream.playbackUrl,
        title: stream.title,
        isLive: "true",
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.state}>
        <ActivityIndicator color={AppTheme.colors.accent} />
        <Text style={styles.stateText}>Loading Live Studio...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={AppTheme.colors.accent}
        />
      }
    >
      <Text style={styles.kicker}>Creator Studio</Text>
      <Text style={styles.title}>Live Studio</Text>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>How broadcasting works</Text>
        <Text style={styles.infoText}>
          Creating a stream does NOT start broadcasting. Your phone cannot
          stream directly — open OBS or another RTMP encoder, paste the
          server URL and stream key below, and start streaming. The stream
          goes live automatically the moment the broadcast reaches the
          server.
        </Text>
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      {/* Create form */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Create a new stream</Text>

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Stream title"
          placeholderTextColor={AppTheme.colors.textSubtle}
          style={styles.input}
        />

        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Description (optional)"
          placeholderTextColor={AppTheme.colors.textSubtle}
          multiline
          style={[styles.input, styles.inputMultiline]}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryRow}
        >
          {CATEGORIES.map((item) => (
            <TouchableOpacity
              key={item}
              style={[
                styles.categoryChip,
                category === item && styles.categoryChipActive,
              ]}
              onPress={() => setCategory(item)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  category === item && styles.categoryChipTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TextInput
          value={thumbnail}
          onChangeText={setThumbnail}
          placeholder="Thumbnail image URL (optional)"
          placeholderTextColor={AppTheme.colors.textSubtle}
          autoCapitalize="none"
          style={styles.input}
        />

        <TouchableOpacity
          style={[styles.button, creating && styles.buttonDisabled]}
          disabled={creating}
          onPress={submit}
        >
          <Text style={styles.buttonText}>
            {creating ? "Creating..." : "Create Stream"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* My streams */}
      <Text style={[styles.sectionTitle, styles.streamsHeading]}>
        My streams ({streams.length})
      </Text>

      {streams.length === 0 && (
        <Text style={styles.empty}>
          You have no streams yet. Create one above to get your RTMP
          credentials.
        </Text>
      )}


      {streams.map((stream) => {
        const status = streamStatusOf(stream);
        const expanded = expandedId === String(stream._id);
        const ingest = stream.ingest || {};

        return (
          <View key={stream._id} style={styles.card}>
            <View style={styles.streamHeader}>
              <View style={[styles.statusPill, { backgroundColor: status.color }]}>
                <Text style={styles.statusPillText}>{status.label}</Text>
              </View>

              <Text style={styles.streamTitle} numberOfLines={2}>
                {stream.title}
              </Text>

              <Text style={styles.streamMeta}>
                {stream.isLive
                  ? `Started ${formatTime(stream.startedAt)}`
                  : stream.endedAt
                    ? `Ended ${formatTime(stream.endedAt)}`
                    : stream.isScheduled && stream.scheduledFor
                      ? `Scheduled for ${formatTime(stream.scheduledFor)}`
                      : "Waiting for broadcast"}
              </Text>

              {!!stream.playbackUrl && (
                <Text style={styles.streamMeta} numberOfLines={1}>
                  Playback: {stream.playbackUrl}
                </Text>
              )}

              <View style={styles.streamActions}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() =>
                    setExpandedId(expanded ? null : String(stream._id))
                  }
                >
                  <Text style={styles.secondaryButtonText}>
                    {expanded ? "Hide setup" : "Show setup & key"}
                  </Text>
                </TouchableOpacity>

                {!!stream.playbackUrl && (
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => previewStream(stream)}
                  >
                    <Text style={styles.secondaryButtonText}>Preview</Text>
                  </TouchableOpacity>
                )}

                {(stream.isLive || stream.isScheduled) && (
                  <TouchableOpacity
                    style={[styles.secondaryButton, styles.dangerButton]}
                    onPress={() => endStream(stream)}
                  >
                    <Text style={styles.secondaryButtonText}>End</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {expanded && (
              <View style={styles.setupBox}>
                {!!(ingest.warnings || []).length && (
                  <View style={styles.warningBox}>
                    {(ingest.warnings || []).map((warning: string) => (
                      <Text key={warning} style={styles.warningText}>
                        ⚠ {warning}
                      </Text>
                    ))}
                  </View>
                )}

                <Text style={styles.setupLabel}>RTMP server URL</Text>
                <TouchableOpacity
                  style={styles.copyRow}
                  onPress={() =>
                    shareValue("RTMP server URL", ingest.rtmpUrl || "")
                  }
                >
                  <Text style={styles.copyValue} selectable>
                    {ingest.rtmpUrl || "Unavailable — set RTMP_PUBLIC_URL/PUBLIC_HOST"}
                  </Text>
                  <Text style={styles.copyHint}>Share</Text>
                </TouchableOpacity>

                <Text style={styles.setupLabel}>Stream key</Text>
                <TouchableOpacity
                  style={styles.copyRow}
                  onPress={() => shareValue("Stream key", stream.streamKey || "")}
                >
                  <Text style={styles.copyValue} selectable>
                    {stream.streamKey || "Unavailable"}
                  </Text>
                  <Text style={styles.copyHint}>Share</Text>
                </TouchableOpacity>

                <Text style={styles.setupSteps}>
                  1. Open OBS (or any RTMP encoder) on your computer.{"\n"}
                  2. Settings → Stream → Custom server: paste the server URL.{"\n"}
                  3. Paste the stream key.{"\n"}
                  4. Click Start Streaming — this stream goes LIVE
                  automatically.{"\n"}
                  5. Keep the key secret — anyone with it can broadcast on
                  your stream.
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppTheme.colors.background,
  },

  content: {
    padding: 20,
    paddingBottom: 96,
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
    marginBottom: 16,
  },

  infoBox: {
    backgroundColor: AppTheme.colors.surface,
    borderColor: AppTheme.colors.border,
    borderWidth: 1,
    borderRadius: AppTheme.radius.md,
    padding: 14,
    marginBottom: 18,
  },

  infoTitle: {
    color: AppTheme.colors.text,
    fontWeight: "900",
    marginBottom: 6,
  },

  infoText: {
    color: AppTheme.colors.textMuted,
    lineHeight: 20,
  },

  error: {
    color: AppTheme.colors.danger,
    marginBottom: 14,
  },

  card: {
    backgroundColor: AppTheme.colors.surface,
    borderColor: AppTheme.colors.border,
    borderWidth: 1,
    borderRadius: AppTheme.radius.md,
    padding: 16,
    marginBottom: 14,
  },

  sectionTitle: {
    color: AppTheme.colors.text,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 12,
  },

  streamsHeading: {
    marginTop: 10,
  },

  input: {
    minHeight: 50,
    backgroundColor: AppTheme.colors.input,
    color: AppTheme.colors.text,
    borderRadius: AppTheme.radius.md,
    borderColor: AppTheme.colors.border,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },

  inputMultiline: {
    minHeight: 84,
    textAlignVertical: "top",
  },

  categoryRow: {
    marginBottom: 12,
  },

  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: AppTheme.colors.input,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    marginRight: 8,
  },

  categoryChipActive: {
    backgroundColor: AppTheme.colors.accent,
    borderColor: AppTheme.colors.accent,
  },

  categoryChipText: {
    color: AppTheme.colors.textMuted,
    fontWeight: "700",
    fontSize: 13,
  },

  categoryChipTextActive: {
    color: AppTheme.colors.background,
  },

  button: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppTheme.colors.accent,
    borderRadius: AppTheme.radius.md,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: AppTheme.colors.background,
    fontWeight: "900",
  },

  empty: {
    color: AppTheme.colors.textMuted,
    lineHeight: 21,
    marginBottom: 16,
  },

  streamHeader: {
    gap: 6,
  },

  statusPill: {
    alignSelf: "flex-start",
    borderRadius: AppTheme.radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  statusPillText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },

  streamTitle: {
    color: AppTheme.colors.text,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 4,
  },

  streamMeta: {
    color: AppTheme.colors.textMuted,
    fontSize: 13,
  },

  streamActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },

  secondaryButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: AppTheme.radius.sm,
    backgroundColor: AppTheme.colors.input,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },

  dangerButton: {
    borderColor: AppTheme.colors.danger,
  },

  secondaryButtonText: {
    color: AppTheme.colors.text,
    fontWeight: "800",
    fontSize: 13,
  },

  setupBox: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: AppTheme.colors.border,
  },

  warningBox: {
    backgroundColor: "rgba(224,161,0,0.12)",
    borderRadius: AppTheme.radius.sm,
    padding: 10,
    marginBottom: 12,
  },

  warningText: {
    color: AppTheme.colors.warning || "#E0A100",
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 4,
  },

  setupLabel: {
    color: AppTheme.colors.textSubtle,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 4,
  },

  copyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: AppTheme.colors.input,
    borderRadius: AppTheme.radius.sm,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: 12,
    marginBottom: 12,
  },

  copyValue: {
    color: AppTheme.colors.text,
    flex: 1,
    fontSize: 13,
  },

  copyHint: {
    color: AppTheme.colors.accent,
    fontWeight: "900",
    fontSize: 12,
    marginLeft: 10,
  },

  setupSteps: {
    color: AppTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 21,
  },
});

