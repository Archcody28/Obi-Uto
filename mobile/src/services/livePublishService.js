/*
 * Phase 30 — native mobile RTMP publish capability probe.
 *
 * Technology decision: expo-nodemediaclient (NodeMedia NodePublisher) is the
 * native module that publishes the device camera + microphone to the existing
 * NodeMediaServer RTMP ingest on Expo SDK 56. expo-camera alone can only
 * preview/record locally — it cannot publish an RTMP stream.
 *
 * Verified API (expo-nodemediaclient 0.2.11):
 *   import { NodePublisher } from "expo-nodemediaclient";
 *   <NodePublisher ref url frontCamera volume videoParam audioParam
 *     videoOrientation onEventCallback style />
 *   ref.start(publishUrl) / ref.stop()
 *   NodePublisher.NMC_CODEC_ID_H264 / NMC_CODEC_ID_AAC / NMC_PROFILE_AUTO /
 *     VIDEO_ORIENTATION_PORTRAIT
 * Mic mute = volume 0 / 1 (no separate mic prop).
 *
 * Native modules are unavailable in Expo Go, so a custom dev build
 * (`expo run:android` / `expo run:ios` or EAS development build) is required
 * for real broadcasting. This module lazy-requires the publisher so Expo Go
 * (and web) never crash at import time: capability is reported honestly and
 * the UI shows "development build required" instead of faking a broadcast.
 */

let cached = null;

export function getNativePublishCapability() {
  if (cached) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("expo-nodemediaclient");
    const NodePublisher = mod.NodePublisher || mod.default?.NodePublisher || mod.default;
    if (!NodePublisher) throw new Error("NodePublisher export missing");
    cached = { available: true, NodePublisher, reason: "" };
  } catch (err) {
    cached = {
      available: false,
      NodePublisher: null,
      reason:
        "Native live publishing needs a development build with expo-nodemediaclient. " +
        "Expo Go cannot publish camera RTMP. " +
        `(${err?.message || err})`,
    };
  }
  return cached;
}

/* RTMP publish URL: server URL + /live/ + stream key (never shown to user). */
export function buildPublishUrl(rtmpUrl, streamKey) {
  const base = String(rtmpUrl || "").replace(/\/+$/, "");
  return `${base}/live/${String(streamKey || "")}`;
}
