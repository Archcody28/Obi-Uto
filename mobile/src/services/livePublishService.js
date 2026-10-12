/*
 * Phase 30.1 — native mobile RTMP publish capability probe (Expo Go safe).
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
    const ownership = Constants?.appOwnership;
    // `null`/undefined (web) is also treated as "no native publisher".
    return !ownership || ownership === "expo";
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
  // Fast, side-effect-free path: Expo Go (and web) never require() the
  // native package, so requireNativeModule can never throw into rendering.
  if (isExpoGo()) {
    cached = unavailable(
      `${DEV_BUILD_REQUIRED_MSG} (running in Expo Go)`
    );
    return cached;
  }
  try {
    // Lazy + guarded: only a dev build with the native module reaches here.
    const mod = /** @type {any} */ (require("expo-nodemediaclient"));
    const anyMod = /** @type {any} */ (mod);
    const NodePublisher =
      anyMod?.NodePublisher ||
      anyMod?.default?.NodePublisher ||
      anyMod?.default ||
      null;
    if (!NodePublisher) throw new Error("NodePublisher export missing");
    cached = { available: true, NodePublisher, reason: "" };
  } catch (err) {
    cached = unavailable(
      `${DEV_BUILD_REQUIRED_MSG} (${(err && err.message) || err})`
    );
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

