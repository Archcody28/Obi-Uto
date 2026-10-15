# Phase 32 — Open-Source RTMP Publishing (expo-live-stream / RootEncoder)

Replaces the paid NodeMedia client (`expo-nodemediaclient`) with
`expo-live-stream` 1.3.1 (MIT; Android publishing via RootEncoder 2.6.7).

## Compatibility gate (passed)

- License: MIT. Android: `com.github.pedroSG94.RootEncoder:library:2.6.7`
  (+ `libvlc-all` for the player side only). No config plugin needed.
- Peer deps `expo/react/react-native: *` — compatible with Expo SDK 56 /
  React Native 0.85.3 / New Architecture (Fabric events registered, Kotlin).
- Native check: `:expo-live-stream:compileDebugKotlin` BUILD SUCCESSFUL.
- Full app: `:app:assembleDebug` BUILD SUCCESSFUL in 14m03s (arm64-v8a) →
  `mobile/android/app/build/outputs/apk/debug/app-debug.apk` (145.9 MB).
  APK dex inspection: RootEncoder (`com.pedro.*`) and `expo.modules.livestream`
  classes present; zero NodeMedia references.
- No Expo/React Native upgrade, no second paid SDK, no fake media.

## What changed

- `mobile/src/services/livePublishService.js` — probes `expo-live-stream`
  (`ExpoLiveStreamPublisherView`), Expo Go safe (no top-level native import);
  `loadPublisherView()` loader (+ `loadNodePublisher` back-compat alias);
  `registerNodeMediaLicense()` is now a `not-applicable-open-source` no-op.
- `mobile/src/screens/LiveCameraScreen.tsx` — single mounted publisher view
  owns the camera for preview AND publishing (preview on mount via RootEncoder
  `startPreview`; Start Live calls `ref.start(publishUrl)` on the same view).
  Flip = `ref.switchCamera()`, mute = `ref.toggleMute()` via sync effects
  (guarded refs, no double-toggle, no remount). Events:
  `onConnectionSuccess/Failed`, `onDisconnect`, `onStreamStateChanged`.
  Lifecycle preserved: staged URL in ref only (never state/logs), sanitized
  errors, owner-status poll gates LIVE, intentional-stop disconnect gate,
  heartbeat, End Live marks ENDED via `endOwnStream`.
- `mobile/src/api/liveStreamApi.js` — technology comment updated.
- `mobile/package.json` / `package-lock.json` — `expo-live-stream` added,
  `expo-nodemediaclient` removed (after the replacement built).
- Backend untouched: same `/live/<streamKey>` ingest, LiveStream/chat/
  viewer-count/HLS architecture. Keys stay owner-only (never shown/logged).
- `validation/phase32/harness.js` — 12 static checks (new). Phase 30 + 31.1
  harnesses updated for the new publisher (backend assertions unchanged).

## Verification

- `npx tsc --noEmit` (mobile): clean.
- Focused eslint on touched files: only pre-existing findings
  (`useState(Date.now())`, unused `AppTheme`, permission-hook deps — all in
  HEAD before this phase).
- `npx expo prebuild --platform android`: pass.
- Regression: Phase 30 15/15, Phase 30.5 14/14, Phase 31.1 21/21,
  Phase 32 12/12.
- Physical TECNO tests (1–6): PENDING — require the freshly built debug APK
  installed on the device on the same LAN as the media server. Do NOT claim
  the video path works from connection alone; verify RTMP H.264+AAC, FFprobe
  tracks, viewer playback, and ENDED state on hardware before closing out.

## UX contract (unchanged)

Create Stream → camera preview → Start Live → LIVE after server confirmation
→ End Live. Owner-only RTMP credentials; viewers never see ingest keys.
