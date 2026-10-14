# Phase 31 — Real HLS Packaging & Live Viewer Playback

## Finding
`node-media-server` v4 has NO transcode consumer: the `trans` config block is
inert, so no HLS/MP4 was ever produced. `postPublish` advertised a playback
URL template with no segments behind it.

## Fix
`server/src/streaming/hlsPackager.js`: one FFmpeg per 48-hex stream key that
pulls `rtmp://127.0.0.1:<RTMP_PORT>/live/<key>` and writes
`<MEDIA_ROOT>/live/<key>/index.m3u8` (+ `seg-*.ts`), served by the existing
NMS HTTP server at `<MEDIA_BASE_URL>/live/<key>/index.m3u8`.

- Started on `postPublish`; `playbackStatus=preparing` (or `failed` with an
  honest error when FFmpeg is unavailable / spawn fails).
- `playable` ONLY when playlist + ≥1 `.ts` segment exist on disk
  (`isPlaybackReady`); `GET /api/live-streams/playback/:id` reports
  preparing/playable/failed/ended publicly without leaking keys.
- `donePublish`, `PUT /end/:id`, stale sweep, and restart reconciliation stop
  only that key's packager and remove its HLS files; SIGINT/SIGTERM stop all.
- Mobile `PlayerScreen` polls stream + playback, mounts `VideoView` only when
  playable+ready, keeps chat + viewer counts + follow in every state, with
  honest preparing/failed(retry)/ended copy.

## Environment blocker (this machine)
FFmpeg is NOT installed (`where ffmpeg` fails). Packaging code is complete
and harness-verified (22/22), but no real playlist/segments can be produced
here until FFmpeg is installed and `FFMPEG_PATH` (or PATH) points at it:

- Windows: `winget install Gyan.FFmpeg` (or ffmpeg.org build), then
  `FFMPEG_PATH=C:\ffmpeg\bin\ffmpeg.exe` in `server/.env`.
- Verify: start a broadcast, confirm
  `<MEDIA_ROOT>/live/<key>/index.m3u8` + `seg-*.ts` appear, play
  `http://<PC-LAN-IP>:8000/live/<key>/index.m3u8` from a viewer device.

## Physical verification (NOT performed here)
No phone broadcast, HLS output check, or viewer playback was performed in
this environment — those steps require a device + dev build + FFmpeg and
remain for the operator. Nothing above claims they passed.
