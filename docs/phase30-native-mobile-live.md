# Phase 30 — Native Mobile Camera Live Streaming

Facebook-Live-style flow: title + description + thumbnail -> Create Stream ->
camera preview -> Start Live -> viewers watch -> End Live.

## Broadcasting technology

**`expo-nodemediaclient` (`NodePublisher`)** — selected because:

- It is the NodeMedia native publisher path for Expo SDK 56 (same vendor as
  the existing `node-media-server` RTMP ingest), so the phone publishes
  `rtmp://<host>:1935/live/<streamKey>` exactly like OBS did — the existing
  `postPublish -> isLive=true` lifecycle stays authoritative.
- `expo-camera` alone can only preview/record locally; it cannot publish RTMP.
- Verified API (0.2.11): `<NodePublisher ref url frontCamera volume
  videoParam audioParam videoOrientation onEventCallback />`,
  `ref.start(publishUrl)` / `ref.stop()`, mic mute via `volume 0/1`.

## Dev build requirement (Expo Go NOT supported for broadcasting)

The publisher is a native module: real broadcasting requires a custom dev
build. Expo Go / web show an honest "Development build required" state and
never fake a broadcast.

```sh
cd mobile
npx expo prebuild        # first time (Continuous Native Generation)
npx expo run:android     # or: npx expo run:ios
# alternative: eas build --profile development
```

`app.json` already wires `expo-camera` (permissions), `expo-nodemediaclient`,
Android `CAMERA/RECORD_AUDIO/INTERNET`, and iOS camera/mic usage strings.

## Creator flow

1. `/creator-live` — title, description, category, thumbnail picker
   (`expo-image-picker`), Create Stream.
2. Server `POST /api/live-streams` creates the waiting stream.
3. App navigates to `/live-camera?streamId=...`.
4. Camera screen requests camera+mic, shows the real `NodePublisher` camera
   preview, flip + mute controls, title/thumbnail overlay.
5. Start Live: owner-only `GET /ingest/:id` (key never shown), `POST
   /mobile-signal/:id {publishing}`, `ref.start(publishUrl)`, heartbeat every
   15s, poll `GET /status/:id` every 2s (30s timeout). LIVE badge + duration +
   viewer count appear ONLY after real ingest confirms `isLive=true`.
6. End Live (confirm): `ref.stop()`, `mobile-signal {stopped}`, `PUT
   /end/:id` — viewers get `stream-ended` over Socket.IO and see ended state.

## Backend

- `LiveStream` adds `publisherSource`, `publisherHeartbeatAt`,
  `mobileSessionActive` (no secrets; public projections still strip keys).
- `POST /mobile-signal/:id` (preview/publishing/heartbeat/stopped) records
  the session but NEVER sets `isLive=true`.
- `GET /status/:id` owner-only live confirmation.
- `prePublish` rejects unknown stream keys; `postPublish`/`donePublish`
  maintain publisher fields and mobile session flags.
- `staleSweep` (30s interval) + boot reconciliation end ghost mobile sessions.

## Viewer experience

Unchanged components, kept real: Live Now discovery, thumbnails, creator
identity, LIVE badge, server-tracked viewer counts, HLS playback, chat,
buffering/offline/ended states, follow actions. Ended streams transition via
`stream-ended` socket event + status polling.

## Tests

- `node validation/phase30/harness.js` — 15/15 (lifecycle/security contracts,
  static wiring).
- `node validation/phase29/harness.js` — 80/80 (no regressions).

## Physical-device results

NOT tested on a physical device in this environment (no device + no dev
build + no public RTMP/HLS endpoint available). Real camera publishing,
viewer playback of a phone broadcast, and reconnect behavior still require
on-device verification with a dev build. Automated tests verify contracts
only — they do not claim broadcasting works.
