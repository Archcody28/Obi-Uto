/*
 * Phase 30.2 — native mobile RTMP publish capability probe (Expo Go safe).
 *
 * Detection semantics (Expo documented):
 * - Constants.appOwnership === "expo"  -> running inside Expo Go: return
 *   unavailable WITHOUT touching require(), so the missing native module can
 *   never throw into React rendering.
 * - null / anything else -> development build, standalone, or web: attempt the
 *   guarded require("expo-nodemediaclient") and report honestly. Available only
 *   when the NodePublisher export is actually present and usable.
 *
 * Technology decision: expo-nodemediaclient (NodeMedia NodePublisher) is the
 * native module that publishes the device camera + microphone to the existing
 * NodeMediaServer RTMP ingest on Expo SDK 56. expo-camera alone can only
 * preview/record locally — it cannot publish an RTMP stream.
 *
 * Verified API (expo-nodemediaclient 0.2.11):
 *   <NodePublisher ref url frontCamera volume videoParam audioParam
 *     videoOrientation onEventCallback style />
 *   ref.start(publishUrl) / ref.stop()
 *   NodePublisher.NMC_CODEC_ID_H264 / NMC_CODEC_ID_AAC / NMC_PROFILE_AUTO /
 *     VIDEO_ORIENTATION_PORTRAIT
 * Mic mute = volume 0 / 1 (no separate mic prop).
 *
 * Expo Go safety (Phase 30.1):
 * - This file NEVER imports expo-nodemediaclient at module scope. Metro would
 *   otherwise evaluate the package entry, whose top level calls
 *   requireNativeModule('ExpoNodeMediaClientModule') and throws
 *   "Cannot find native module 'ExpoNodeMediaClientModule'" in Expo Go.
 * - In Expo Go (Constants.appOwnership === 'expo') this module returns a
 *   deterministic `{ available: false }` WITHOUT touching require() at all,
 *   so no native-module failure can escape into React rendering.
 * - Only inside a custom development build (native module present) does the
 *   guarded require path run, and any failure there is caught and reported
 *   as unavailable. The UI then shows "development build required" instead
 *   of crashing or faking a broadcast.
 */

import Constants from "expo-constants";

const DEV_BUILD_REQUIRED_MSG =
  "Live broadcasting needs a custom development build with the native publisher. " +
  "Expo Go cannot broadcast camera RTMP — run `npx expo run:android` / `npx expo run:ios` " +
  "or an EAS development build, then open Live Studio there.";

function isExpoGo() {
  try {
    // Expo documents appOwnership as "expo" inside Expo Go and null otherwise
    // (development build / standalone). Only the exact "expo" value may take
    // the fast path — never treat null as Expo Go, and never rely on
    // executionEnvironment alone (it can be "storeClient" in either case).
    return Constants?.appOwnership === "expo";
  } catch {
    return false;
  }
}

function unavailable(reason) {
  return { available: false, NodePublisher: null, reason };
}

let cached = null;

export function getNativePublishCapability() {
  if (cached) return cached;
  // Fast, side-effect-free path: ONLY Expo Go skips require(). Every other
  // environment (dev build with appOwnership null, standalone, web) attempts
  // the guarded require so a working dev build is never mislabelled Expo Go.
  if (isExpoGo()) {
    cached = unavailable(
      `${DEV_BUILD_REQUIRED_MSG} (running in Expo Go)`
    );
    return cached;
  }
  try {
    // Lazy + guarded: only non-Expo-Go environments reach here.
    // Direct destructured require keeps Metro from evaluating the native entry
    // at module scope; any missing-native-module error is caught below.
    // eslint-disable-next-line
    const mod = require("expo-nodemediaclient");
    const NodePublisher =
      mod?.NodePublisher ||
      mod?.default?.NodePublisher ||
      null;
    // Usable only when the export exists and looks like a component.
    if (!NodePublisher || (typeof NodePublisher !== "function" && typeof NodePublisher !== "object")) {
      throw new Error("NodePublisher export missing or unusable");
    }
    cached = { available: true, NodePublisher, reason: "" };
  } catch (err) {
    // Honest unavailable: preserve the native error for diagnostics, never
    // fake broadcasting and never let the error crash React rendering.
    const detail = (err && err.message) || String(err);
    cached = unavailable(`${DEV_BUILD_REQUIRED_MSG} (${detail})`);
  }
  return cached;
}

/** Guarded loader for the start-live path (dev builds only). Never throws. */
export function loadNodePublisher() {
  try {
    const cap = getNativePublishCapability();
    return cap && cap.available ? cap.NodePublisher : null;
  } catch {
    return null;
  }
}

/* RTMP publish URL: server URL + /live/ + stream key (never shown to user). */
export function buildPublishUrl(rtmpUrl, streamKey) {
  const base = String(rtmpUrl || "").replace(/\/+$/, "");
  return `${base}/live/${String(streamKey || "")}`;
}

export function isDevelopmentBuildRequired(capability) {
  const cap = capability || cached;
  return !cap || cap.available !== true;
}

