import React, {
  useCallback,
  useEffect,
  useMemo,
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
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import {
  endOwnStream,
  getOwnerStatus,
  getStreamIngest,
  sendMobileSignal,
} from "../api/liveStreamApi";
import { AppTheme } from "../constants/theme";
import {
  buildPublishUrl,
  describePublishUrl,
  getNativePublishCapability,
  loadPublisherView,
} from "../services/livePublishService";

/*
 * Phase 30 — Live Camera Preview (Facebook/YouTube-mobile style).
 * Real camera preview -> Start Live -> native RTMP publish
 * -> poll owner status until real ingest flips isLive=true. No fake live.
 *
 * Phase 32 — expo-live-stream (MIT, RootEncoder on Android) replaces the paid
 * client publisher. Unlike the old SDK, the native view runs the camera
 * preview on mount WITHOUT publishing (RootEncoder startPreview in
 * tryInitCamera) and only publishes after ref.start(publishUrl). A single
 * mounted ExpoLiveStreamPublisherView therefore serves as BOTH the pre-live
 * preview and the publisher: no CameraView/publisher swap, no competing
 * camera ownership, no remount-kills-socket hazard. expo-camera is kept only
 * for permission hooks (and as an Expo Go fallback preview, where the native
 * publisher cannot exist).
 */

function sanitizePublishError(msg) {
  /* Phase 30.6: native publisher errors may embed the full rtmp://.../live/<key>
   * URL. Never surface it — redact URLs/keys, keep actionable text. */
  const s = String(msg || "Could not start publishing.");
  const noUrls = s
    .replace(/rtmp:\/\/\S+/gi, "rtmp://<ingest-host>/live/<key-redacted>")
    .replace(/https?:\/\/\S+/gi, "https://<redacted>");
  const noKeys = noUrls.replace(/\b[0-9a-f]{16,}\b/gi, "<key-redacted>");
  return noKeys.length > 220 ? `${noKeys.slice(0, 220)}…` : noKeys;
}

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
  const [ended, setEnded] = useState(false);
  /* Phase 32: single native view owns the camera for its whole lifetime.
   * The ExpoLiveStreamPublisherView previews on mount and publishes after
   * ref.start(url), so it stays mounted from the preview phase through live.
   * publishUrl is staged in a ref (never in state/logs). Flip calls
   * ref.switchCamera(), mute calls ref.toggleMute() — both are live native
   * operations, never remounts. */
  const [publisherActive, setPublisherActive] = useState(false);
  const publishUrlRef = useRef(null);
  const [previewMounted, setPreviewMounted] = useState(false);

  /* Phase 30.1: resolve the native-publisher capability once, never letting a
     native-module failure escape into rendering. Expo Go gets a deterministic
     unavailable result; dev builds load the view via the guarded path. */
  const capability = useMemo(() => {
    try {
      const cap = getNativePublishCapability();
      if (cap && typeof cap === "object") return cap;
    } catch {}
    return {
      available: false,
      PublisherView: null,
      NodePublisher: null, // back-compat key for older capability readers
      reason:
        "Live broadcasting needs a custom development build with the native publisher. " +
        "Expo Go cannot broadcast camera RTMP.",
    };
  }, []);
  const PublisherViewComp = capability.PublisherView || capability.NodePublisher || null;
  const LivePublisher = PublisherViewComp;
  const publisherRef = useRef(null);
  /* Phase 31.1: intentional-stop gate. Native `disconnect` events arriving
   * AFTER requestStop("user-end-live") are normal lifecycle, never errors. */
  const expectDisconnectRef = useRef(false);
  /* Phase 32: native mute/camera sync refs — declared with all other hooks
   * (never after an early return). switchCamera()/toggleMute() are native
   * imperative calls; refs prevent double-toggles across re-renders. */
  const mutedNativeRef = useRef(false);
  const frontNativeRef = useRef(false);
  const pollRef = useRef(null);
  const heartbeatRef = useRef(null);
  const mountedRef = useRef(true);
  const liveRef = useRef(false);
  useEffect(() => {
    liveRef.current = live;
  }, [live]);

  const stopTimers = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      clearTimeout(pollRef.current);
    }
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    pollRef.current = null;
    heartbeatRef.current = null;
  }, []);

  const stopReasonRef = useRef<string | null>(null);
  const requestStop = useCallback((reason: string) => {
    if (stopReasonRef.current) return; // first reason wins; no contradictory logs
    stopReasonRef.current = reason;
    console.log(`[live] publish stop requested: ${reason}`);
    stopTimers();
    try {
      publisherRef.current?.stop?.();
    } catch {}
  }, [stopTimers]);

  useEffect(() => {
    mountedRef.current = true;
    console.log("[live] camera screen mounted");
    return () => {
      mountedRef.current = false;
      /* Phase 30.5: log WHY the publisher is torn down — an unexpected
       * unmount (navigation/blur) mid-live is itself a disconnect cause. */
      if (liveRef.current) {
        console.log("[live] camera screen UNMOUNTED while live — publisher torn down by navigation");
      } else {
        console.log("[live] camera screen unmounted (not live)");
      }
      requestStop("unmount-teardown");
    };
  }, [stopTimers, requestStop]);

  useFocusEffect(
    useCallback(() => {
      console.log(
        `[live] camera screen focused (live=${liveRef.current ? "yes" : "no"} phase-indicator)`
      );
      return () =>
        console.log(
          `[live] camera screen blurred (live=${liveRef.current ? "yes" : "no"}; publisher kept alive until unmount/user-end/remote-end)`
        );
    }, [])
  );

  const handleEndedRemotely = useCallback(() => {
    /* Phase 30.5: only honor a remote end when we were actually live —
     * a stale heartbeat carrying endedAt must never kill a fresh publish. */
    if (!liveRef.current) {
      console.log("[live] remote endedAt seen while not live; ignoring (stale)");
      return;
    }
    console.log("[live] remote end confirmed while live; stopping publisher");
    expectDisconnectRef.current = true; // remote end: trailing disconnect is normal
    if (mountedRef.current) {
      setLive(false);
      setPhase("preview");
      setError("The stream ended.");
    }
    requestStop("remote-ended");
  }, [requestStop]);

  const startHeartbeat = useCallback((id) => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    let consecutiveFailures = 0;
    heartbeatRef.current = setInterval(() => {
      sendMobileSignal(id, "heartbeat")
        .then((res) => {
          consecutiveFailures = 0;
          const info = res?.stream || {};
          if (mountedRef.current && typeof info.viewers === "number") setViewers(info.viewers);
          if (mountedRef.current && (res?.live || info?.isLive) && !liveRef.current) {
            setLive(true);
            setPhase("live");
            setLiveAt((prev) => prev ?? Date.now());
          }
          /* Phase 30.5: only a live session can remotely end. */
          if (mountedRef.current && info?.endedAt) handleEndedRemotely();
        })
        .catch((err) => {
          /* Phase 30.5: transient heartbeat failure must NEVER stop the
           * publisher (this killed streams ~15s after start). Log sanitized
           * status and keep publishing; only an authoritative endedAt while
           * live may stop it. */
          consecutiveFailures += 1;
          const status = err?.response?.status || "network";
          console.log(`[live] heartbeat failed (${consecutiveFailures}x, status ${status}); keeping publisher alive`);
        });
    }, 15000);
  }, [handleEndedRemotely]);

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
    let consecutive429 = 0;
    pollRef.current = setInterval(async () => {
      try {
        const status = await getOwnerStatus(id);
        consecutive429 = 0;
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
      } catch (err: any) {
        /* Phase 30.3: transient 429 (or offline) must not kill confirmation.
         * Back off briefly and keep polling until the deadline.
         * Phase 30.5: log sanitized poll outcome (status only, never tokens);
         * non-429 failures keep polling until the deadline — they never stop
         * the publisher here. */
        if (err?.response?.status === 429) {
          consecutive429 += 1;
          const backoffMs = Math.min(2000 * Math.pow(2, consecutive429 - 1), 8000);
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = setTimeout(() => {
            if (mountedRef.current) pollForLive(id, deadline);
          }, backoffMs) as any;
          console.log(`[live] owner-status poll 429; backing off ${backoffMs}ms`);
          return;
        }
        const pollStatus = err?.response?.status || "network";
        console.log(`[live] owner-status poll failed (status ${pollStatus}); retrying until deadline`);
      }
      if (Date.now() > deadline) {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        if (mountedRef.current) {
          setStarting(false);
          setError("Server has not confirmed your broadcast yet. Check connection, then retry.");
          requestStop("confirm-timeout");
          setPhase("preview");
        }
      }
    }, 2000);
  }, [requestStop]);

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
    /* Phase 30.1: the native publisher is (re)loaded only inside this guarded
       start path. Expo Go resolves to null here and exits with the
       development-build message — never a native-module crash. */
    const Publisher = loadPublisherView();
    if (!capability.available || !LivePublisher || !Publisher) {
      Alert.alert("Development build required", capability.reason);
      return;
    }
    if (!previewMounted || !publisherRef.current?.start) {
      Alert.alert("Camera warming up", "The camera preview is still starting. Wait a moment, then tap Start Live again.");
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
      /* Phase 30.3 sanitized publish log: host/port/prefix only, key redacted. */
      const diag = describePublishUrl(publishUrl);
      console.log(
        `[live] publishing host=${diag.host} port=${diag.port} path=${diag.pathPrefix} key=${diag.keySuffix}`
      );
      if (diag.isLoopback) {
        throw new Error(
          `Ingest host is ${diag.host} — unreachable from a physical phone. Set server RTMP_PUBLIC_URL to the PC LAN IP.`
        );
      }
      await sendMobileSignal(streamId, "publishing");
      setPhase("connecting");
      stopReasonRef.current = null; // fresh attempt clears the previous stop reason
      expectDisconnectRef.current = false; // fresh attempt: disconnects are errors again
      /* Phase 32: single-view model — the publisher view is ALREADY mounted
       * (previewing). Keep the URL in a ref only, mark publishing active, and
       * start the native RTMP stream directly. No mount swap, no second start
       * effect. Key never in state/logs/error text. */
      publishUrlRef.current = publishUrl;
      setPublisherActive(true);
      console.log("[live] publisher start requested");
      try {
        publisherRef.current?.start?.(publishUrl);
      } catch (startErr) {
        publishUrlRef.current = null;
        setPublisherActive(false);
        setPhase("preview");
        throw startErr;
      }
      console.log("[live] publisher start dispatched");
      startHeartbeat(String(streamId));
      setStarting(false);
      pollForLive(String(streamId), Date.now() + 30000);
    } catch (err) {
      setStarting(false);
      setPhase("preview");
      if (!liveRef.current) setPublisherActive(false);
      publishUrlRef.current = null;
      const raw = err?.response?.data?.message || err?.message || "Could not start publishing.";
      setError(sanitizePublishError(raw));
    }
  };

  const finishEndedUi = useCallback((message) => {
    /* Phase 30.6: single consistent teardown — timers cleared, publisher
     * stopped, UI shows success. Called for backend-confirmed, already-ended,
     * and offline-verified ends alike. */
    stopTimers();
    publishUrlRef.current = null;
    if (mountedRef.current) {
      setPublisherActive(false);
      setLive(false);
      setPhase("ended");
      setEnded(true);
      setEnding(false);
      setError("");
    }
    console.log(`[live] ended: ${message}`);
    router.replace("/creator-live");
  }, [stopTimers]);

  const endLive = () => {
    if (!streamId) return;
    Alert.alert("End live stream?", "This ends the broadcast for all viewers.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "End Live",
        style: "destructive",
        onPress: async () => {
          setEnding(true);
          console.log("[live] user requested end");
          /* Phase 31.1: mark intentional stop BEFORE touching the publisher
           * so the native disconnect that follows is treated as normal
           * lifecycle, never as a publishing error. Status stays ENDED. */
          expectDisconnectRef.current = true;
          /* Phase 30.6: stop native publishing + polling FIRST so donePublish
           * fires immediately; consult the server afterwards. UI always ends
           * consistently even if the network request fails. */
          requestStop("user-end-live");
          try {
            await sendMobileSignal(streamId, "stopped");
          } catch {}
          let serverEnded = false;
          try {
            await endOwnStream(streamId);
            serverEnded = true;
          } catch (err) {
            const status = err?.response?.status;
            const msg = String(err?.response?.data?.message || "");
            if (status === 429) {
              /* Phase 30.6: a 429 here must not strand the user "live" — the
               * RTMP socket is already down so donePublish will end the stream
               * server-side. Verify via owner status before failing. */
              console.log("[live] end request rate-limited (429); verifying server state");
              try {
                const check = await getOwnerStatus(streamId);
                const info = check?.stream || {};
                if (!check?.live && !info?.isLive) {
                  finishEndedUi("donePublish already ended the stream (429 verified)");
                  return;
                }
                if (info?.endedAt) {
                  finishEndedUi("stream already ended (429 verified)");
                  return;
                }
              } catch {}
              if (mountedRef.current) {
                setEnding(false);
                Alert.alert(
                  "Ending… please retry",
                  "The server is busy. Your camera has stopped; tap End Live again in a moment to confirm."
                );
              }
              return;
            }
            /* Non-429 failure (offline etc.): verify — a donePublish may have
             * already ended it server-side. */
            try {
              const check = await getOwnerStatus(streamId);
              const info = check?.stream || {};
              if ((!check?.live && !info?.isLive) || info?.endedAt) {
                finishEndedUi("server already ended (verified after end-request failure)");
                return;
              }
            } catch {}
            // Still live server-side: keep the ended-UI (camera off, polling
            // off) but tell the user to retry the confirm, not that it failed.
            if (mountedRef.current) {
              setEnding(false);
              Alert.alert(
                "Camera stopped — confirm End Live",
                `${msg || "The confirm request failed."} Your camera has stopped. Tap End Live again to confirm.`
              );
            }
            return;
          }
          if (serverEnded) finishEndedUi("backend confirmed end");
        },
      },
    ]);
  };

  /* Phase 32: keep native mute/camera in sync via imperative calls (the new
   * view exposes switchCamera()/toggleMute(); flip/mute state lives in React).
   * Declared BEFORE any early return — hooks must run unconditionally. */
  useEffect(() => {
    try {
      if (previewMounted && publisherRef.current?.toggleMute && muted !== mutedNativeRef.current) {
        publisherRef.current.toggleMute();
        mutedNativeRef.current = muted;
        console.log(`[live] mic ${muted ? "muted" : "unmuted"}`);
      }
    } catch {}
  }, [muted, previewMounted]);
  useEffect(() => {
    try {
      if (previewMounted && publisherRef.current?.switchCamera && frontCamera !== frontNativeRef.current) {
        publisherRef.current.switchCamera();
        frontNativeRef.current = frontCamera;
        console.log(`[live] camera flipped to ${frontCamera ? "front" : "back"}`);
      }
    } catch {}
  }, [frontCamera, previewMounted]);

  const handleNativeDisconnect = useCallback(() => {
    /* Intentional-stop disconnects are NORMAL lifecycle — gate FIRST. */
    if (expectDisconnectRef.current || stopReasonRef.current) {
      console.log("[live] publisher disconnect after intentional stop (normal lifecycle)");
      return;
    }
    if (mountedRef.current && (liveRef.current || publisherActive)) {
      setError("Publish connection lost. Check connection, then retry.");
      requestStop("native-disconnect");
      if (mountedRef.current) setPhase("preview");
    }
  }, [publisherActive, requestStop]);

  const handleNativeFailed = useCallback((rawMsg) => {
    if (expectDisconnectRef.current || stopReasonRef.current) {
      console.log("[live] publisher failure after intentional stop (normal lifecycle)");
      return;
    }
    const safe = sanitizePublishError(rawMsg || "Could not start publishing.");
    console.log(`[live] native publisher event: ${safe}`);
    if (mountedRef.current) setError(`Publish error: ${safe}`);
    requestStop(`native-event:${safe.slice(0, 80)}`);
    if (mountedRef.current && !liveRef.current) setPhase("preview");
  }, [requestStop]);

  if (!streamId) {
    return (
      <View style={styles.state}>
        <Text style={styles.stateText}>No stream selected.</Text>
      </View>
    );
  }

  const pillColor = live ? "#E0245E" : ended ? "#1B7A3D" : "#141414";
  const pillLabel = live ? "LIVE" : ended || phase === "ended" ? "ENDED" : phase === "connecting" ? "CONNECTING" : "PREVIEW";


  /* Phase 32 render contract: ONE native view owns the camera for its whole
   * lifetime (preview on mount + publish after ref.start). Expo CameraView
   * is used ONLY as an Expo Go fallback preview. NEVER mount both at once. */
  const showNativePublisher = capability.available && LivePublisher && hasPermissions && !ended;
  const showExpoGoPreview = !showNativePublisher && hasPermissions && !ended;

  return (
    <View style={styles.container}>
      <View style={styles.cameraWrap}>
        {showNativePublisher ? (
          <>
            {/* Phase 32: single ExpoLiveStreamPublisherView = preview + publisher.
                720x1280 portrait @2Mbps H264 + 64k AAC matches the FFmpeg HLS
                packager expectation. NO key={} — remounting mid-publish kills
                the RTMP socket. frontCamera is set once at mount; later flips
                go through ref.switchCamera() via the sync effect above. */}
            <LivePublisher
              ref={publisherRef}
              style={styles.camera}
              frontCamera={frontCamera}
              videoWidth={720}
              videoHeight={1280}
              videoBitrate={2000000}
              videoFps={30}
              audioBitrate={64000}
              audioSampleRate={44100}
              onLayout={() => {
                if (!previewMounted) {
                  setPreviewMounted(true);
                  console.log("[live] publisher preview mounted");
                }
              }}
              onConnectionSuccess={() => {
                console.log("[live] native publisher connected");
              }}
              onStreamStateChanged={(event) => {
                const state = event?.nativeEvent?.state;
                if (state) console.log(`[live] native stream state: ${state}`);
                if (state === "failed" || state === "auth_error") handleNativeFailed(state);
                else if (state === "disconnected") handleNativeDisconnect();
              }}
              onConnectionFailed={(event) => {
                handleNativeFailed(event?.nativeEvent?.msg);
              }}
              onDisconnect={() => {
                handleNativeDisconnect();
              }}
            />
          </>
        ) : showExpoGoPreview ? (
          /* Phase 32: Expo Go fallback preview only — CameraView owns the
           * camera here because the native publisher cannot exist in Expo Go.
           * In dev builds the native view above handles both preview+publish. */
          <CameraView
            style={styles.camera}
            facing={frontCamera ? "front" : "back"}
            mirror={frontCamera}
            mode="video"
          />
        ) : (
          <View style={[styles.camera, styles.cameraFallback]}>
            <Text style={styles.fallbackTitle}>
              {!hasPermissions ? "Camera and mic needed" : ended ? "Stream ended" : "Development build required"}
            </Text>
            <Text style={styles.fallbackText}>
              {!hasPermissions
                ? "Grant camera and mic access to preview."
                : ended
                  ? "Your broadcast has ended. Create a new stream to go live again."
                  : capability.reason}
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
