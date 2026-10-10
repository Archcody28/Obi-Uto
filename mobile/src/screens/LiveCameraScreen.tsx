import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import {
  endOwnStream,
  getOwnerStatus,
  getStreamIngest,
  sendMobileSignal,
} from "../api/liveStreamApi";
import { AppTheme } from "../constants/theme";
import {
  buildPublishUrl,
  getNativePublishCapability,
} from "../services/livePublishService";

/*
 * Phase 30 — Live Camera Preview (Facebook/YouTube-mobile style).
 * Real camera preview -> Start Live -> native RTMP publish (NodePublisher)
 * -> poll owner status until real ingest flips isLive=true. No fake live.
 */

function formatDuration(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default function LiveCameraScreen() {
  const params = useLocalSearchParams();
  const streamId = Array.isArray(params.streamId) ? params.streamId[0] : params.streamId;
  const title = Array.isArray(params.title) ? params.title[0] : params.title;
  const thumbnail = Array.isArray(params.thumbnail) ? params.thumbnail[0] : params.thumbnail;

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [frontCamera, setFrontCamera] = useState(false);
  const [muted, setMuted] = useState(false);
  const [phase, setPhase] = useState("preview");
  const [live, setLive] = useState(false);
  const [liveAt, setLiveAt] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [viewers, setViewers] = useState(0);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);

  const capability = getNativePublishCapability();
  const NodePublisher = capability.NodePublisher;
  const publisherRef = useRef(null);
  const pollRef = useRef(null);
  const heartbeatRef = useRef(null);
  const mountedRef = useRef(true);
  const liveRef = useRef(false);
  liveRef.current = live;

  const stopTimers = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    pollRef.current = null;
    heartbeatRef.current = null;
  }, []);

  const handleEndedRemotely = useCallback(() => {
    stopTimers();
    try {
      publisherRef.current?.stop?.();
    } catch {}
    if (mountedRef.current) {
      setLive(false);
      setPhase("preview");
      setError("The stream ended.");
    }
  }, [stopTimers]);

  const startHeartbeat = useCallback((id) => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = setInterval(() => {
      sendMobileSignal(id, "heartbeat")
        .then((res) => {
          const info = res?.stream || {};
          if (mountedRef.current && typeof info.viewers === "number") setViewers(info.viewers);
          if (mountedRef.current && (res?.live || info?.isLive) && !liveRef.current) {
            setLive(true);
            setPhase("live");
            setLiveAt((prev) => prev ?? Date.now());
          }
          if (mountedRef.current && info?.endedAt) handleEndedRemotely();
        })
        .catch(() => {});
    }, 15000);
  }, [handleEndedRemotely]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopTimers();
      try {
        publisherRef.current?.stop?.();
      } catch {}
    };
  }, [stopTimers]);

  useEffect(() => {
    if (!liveAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [liveAt]);

  useEffect(() => {
    (async () => {
      try {
        if (!cameraPermission?.granted) await requestCameraPermission();
      } catch {}
      try {
        if (!micPermission?.granted) await requestMicPermission();
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!streamId) return;
    sendMobileSignal(streamId, "preview").catch(() => {});
  }, [streamId]);

  const hasPermissions = Boolean(cameraPermission?.granted && micPermission?.granted);

  const pollForLive = useCallback((id, deadline) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const status = await getOwnerStatus(id);
        const info = status?.stream || {};
        if (mountedRef.current && typeof info.viewers === "number") setViewers(info.viewers);
        if (status?.live || info?.isLive) {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          if (mountedRef.current) {
            setLive(true);
            setPhase("live");
            setLiveAt(Date.now());
            setStarting(false);
          }
          return;
        }
      } catch {}
      if (Date.now() > deadline) {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        if (mountedRef.current) {
          setStarting(false);
          setError("Server has not confirmed your broadcast yet. Check connection, then retry.");
          try {
            await publisherRef.current?.stop?.();
          } catch {}
          setPhase("preview");
        }
      }
    }, 2000);
  }, []);

  const startLive = async () => {
    if (!streamId) {
      Alert.alert("Missing stream", "No stream id was provided.");
      return;
    }
    if (!hasPermissions) {
      Alert.alert("Permissions needed", "Camera and microphone access are required to go live.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Grant",
          onPress: async () => {
            await requestCameraPermission();
            await requestMicPermission();
          },
        },
      ]);
      return;
    }
    if (!capability.available || !NodePublisher) {
      Alert.alert("Development build required", capability.reason);
      return;
    }
    setStarting(true);
    setError("");
    try {
      const ingest = await getStreamIngest(streamId);
      const stream = ingest?.stream || ingest;
      const publishUrl = buildPublishUrl(
        stream?.ingest?.rtmpUrl || ingest?.ingest?.rtmpUrl,
        stream?.streamKey || ingest?.streamKey
      );
      if (!publishUrl || publishUrl.endsWith("/live/")) throw new Error("Ingest unavailable");
      await sendMobileSignal(streamId, "publishing");
      setPhase("connecting");
      await publisherRef.current?.start?.(publishUrl);
      startHeartbeat(String(streamId));
      pollForLive(String(streamId), Date.now() + 30000);
    } catch (err) {
      setStarting(false);
      setPhase("preview");
      setError(err?.response?.data?.message || err?.message || "Could not start publishing.");
    }
  };

  const endLive = () => {
    if (!streamId) return;
    Alert.alert("End live stream?", "This ends the broadcast for all viewers.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "End Live",
        style: "destructive",
        onPress: async () => {
          setEnding(true);
          try {
            try {
              await publisherRef.current?.stop?.();
            } catch {}
            try {
              await sendMobileSignal(streamId, "stopped");
            } catch {}
            await endOwnStream(streamId);
          } catch (err) {
            Alert.alert("Unable to end stream", err?.response?.data?.message || "Try again.");
            setEnding(false);
            return;
          }
          stopTimers();
          router.replace("/creator-live");
        },
      },
    ]);
  };

  if (!streamId) {
    return (
      <View style={styles.state}>
        <Text style={styles.stateText}>No stream selected.</Text>
      </View>
    );
  }

  const pillColor = live ? "#E0245E" : "#141414";
  const pillLabel = live ? "LIVE" : phase === "connecting" ? "CONNECTING" : "PREVIEW";

  return (
    <View style={styles.container}>
      <View style={styles.cameraWrap}>
        {capability.available && NodePublisher && hasPermissions ? (
          <NodePublisher
            ref={publisherRef}
            style={styles.camera}
            frontCamera={frontCamera}
            volume={muted ? 0 : 1}
            videoParam={{ width: 720, height: 1280, fps: 30, bitrate: 1500000 }}
            audioParam={{ samplingRate: 44100, channels: 1, bitrate: 64000 }}
            videoOrientation={1}
            onEventCallback={() => {}}
          />
        ) : (
          <View style={[styles.camera, styles.cameraFallback]}>
            <Text style={styles.fallbackTitle}>
              {!hasPermissions ? "Camera and mic needed" : "Development build required"}
            </Text>
            <Text style={styles.fallbackText}>
              {!hasPermissions ? "Grant camera and mic access to preview." : capability.reason}
            </Text>
            {!hasPermissions && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={async () => {
                  await requestCameraPermission();
                  await requestMicPermission();
                }}
              >
                <Text style={styles.secondaryButtonText}>Grant permissions</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        <View style={styles.topOverlay} pointerEvents="none">
          <View style={[styles.statusPill, { backgroundColor: pillColor }]}>
            <View style={styles.liveDot} />
            <Text style={styles.statusText}>{pillLabel}</Text>
          </View>
          {!!title && (
            <Text style={styles.overlayTitle} numberOfLines={1}>
              {String(title)}
            </Text>
          )}
          {live && (
            <Text style={styles.overlayMeta}>
              {formatDuration(liveAt ? (now - liveAt) / 1000 : 0)} - {viewers} watching
            </Text>
          )}
        </View>
        {!!thumbnail && (
          <Image source={{ uri: String(thumbnail) }} style={styles.thumbChip} contentFit="cover" />
        )}
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={() => setFrontCamera((v) => !v)}>
          <Text style={styles.controlText}>Flip</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={() => setMuted((v) => !v)}>
          <Text style={styles.controlText}>{muted ? "Unmute" : "Mute"}</Text>
        </TouchableOpacity>
        {live ? (
          <TouchableOpacity style={[styles.liveButton, styles.endButton]} onPress={endLive} disabled={ending}>
            <Text style={styles.liveButtonText}>{ending ? "Ending..." : "End Live"}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.liveButton, (starting || phase === "connecting") && styles.buttonDisabled]}
            onPress={startLive}
            disabled={starting || phase === "connecting"}
          >
            {starting || phase === "connecting" ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.liveButtonText}>Start Live</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
      {phase === "connecting" && !live && (
        <Text style={styles.hint}>Publishing from camera... waiting for server confirmation.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  cameraWrap: { flex: 1, position: "relative", backgroundColor: "#000" },
  camera: { flex: 1, width: "100%" },
  cameraFallback: { alignItems: "center", justifyContent: "center", padding: 24 },
  fallbackTitle: { color: "#fff", fontWeight: "900", fontSize: 17, marginBottom: 8 },
  fallbackText: { color: "rgba(255,255,255,0.75)", textAlign: "center", lineHeight: 20 },
  topOverlay: { position: "absolute", top: 54, left: 14, right: 14 },
  statusPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 6,
  },
  statusText: { color: "#fff", fontWeight: "900", fontSize: 12 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#fff", marginRight: 6 },
  overlayTitle: { color: "#fff", fontWeight: "800", fontSize: 16, marginBottom: 2 },
  overlayMeta: { color: "#fff", fontSize: 13 },
  thumbChip: {
    position: "absolute",
    bottom: 12,
    left: 12,
    width: 64,
    height: 36,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  controls: { flexDirection: "row", alignItems: "center", padding: 16, backgroundColor: "#0B0D10" },
  controlButton: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, backgroundColor: "#1B1F24", marginRight: 10 },
  controlText: { color: "#fff", fontWeight: "800" },
  liveButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#E0245E",
  },
  endButton: { backgroundColor: "#B00020" },
  liveButtonText: { color: "#fff", fontWeight: "900", fontSize: 16 },
  buttonDisabled: { opacity: 0.6 },
  secondaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#1B1F24",
    marginTop: 12,
  },
  secondaryButtonText: { color: "#fff", fontWeight: "800" },
  error: { color: "#FF8A8A", padding: 12, backgroundColor: "#0B0D10" },
  hint: { color: "rgba(255,255,255,0.7)", paddingHorizontal: 16, paddingBottom: 16, backgroundColor: "#0B0D10" },
  state: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#000", padding: 24 },
  stateText: { color: "#fff" },
});
