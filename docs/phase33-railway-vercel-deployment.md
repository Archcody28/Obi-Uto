# Phase 33 — Railway + Vercel Deployment Preparation

Status: prepared only. **No deployment was performed and no credentials are
stored in this repository.** All variable *names* below are documented with
their purpose; real values belong in each platform's environment settings
(and the git-ignored `server/.env` for local development).

Related: `docs/phase31-hls-packaging.md`, `docs/phase32-open-source-publisher.md`.
Regression: `node validation/phase33/harness.js` +
`node validation/phase33/browser-hls-check.js` (optional; needs Edge/Chromium
+ ffmpeg, skips cleanly otherwise).

---

## 1. Railway (backend, RTMP ingest, HLS packaging)

### 1.1 Service configuration

| Setting | Value |
| --- | --- |
| Root directory | `server` |
| Build | Dockerfile (`server/Dockerfile`) — no separate build command |
| Start command | `node src/index.js` (Docker `CMD`, also `npm start`) |
| Runtime image | `node:22-bookworm-slim` (supported Node LTS) + `ffmpeg` (apt) |
| HTTP port | Railway injects `PORT`; Express binds to it (`server/src/index.js`) |
| Health check path | `/health` (HTTP 200, includes DB ready-state; no auth) |

The image installs FFmpeg because `server/src/streaming/hlsPackager.js`
spawns `ffmpeg` per published stream to produce HLS; without it RTMP ingest
accepts broadcasts but viewers can never play them.

### 1.2 Required environment variables (names only — no values)

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGO_URI` | yes | MongoDB connection string for the existing database. |
| `JWT_SECRET` | yes | Auth token signing secret (≥32 random chars). |
| `NODE_ENV` | yes (`production`) | Enables production-only config strictness (set in image). |
| `PORT` | auto | Injected by Railway; Express already binds `process.env.PORT \|\| 5000`. Do not hardcode. |
| `MEDIA_BASE_URL` | yes | Public **HTTPS** origin of this Railway service with **no port**, e.g. `https://<service-domain>`. Playback URLs become `<MEDIA_BASE_URL>/live/<streamKey>/index.m3u8`, served by the main Express app itself. |
| `RTMP_PUBLIC_URL` | yes (production) | Public RTMP ingest URL from the Railway TCP proxy: `rtmp://<proxy-host>:<proxy-port>`. Without it the server reports an empty RTMP URL plus a warning instead of shipping `localhost`. |
| `PUBLIC_HOST` | optional | Alternative to `RTMP_PUBLIC_URL`: RTMP proxy hostname only (with `RTMP_PORT`). |
| `RTMP_PORT` | optional | Internal RTMP listen port, default `1935`. Must match the TCP-proxy target port. |
| `MEDIA_PORT` | optional | Internal NMS HTTP port, default `8000` (dev/LAN HLS static server uses `MEDIA_PORT+1`). Never expose it publicly. |
| `MEDIA_BIND` | optional | Bind interface for RTMP/NMS, default `0.0.0.0` (loopback would break TCP proxying). |
| `HLS_STATIC` | optional | Set `0` on Railway to skip the extra dev-style HLS static listener; the main API serves `/live` itself (recommended). |
| `FFMPEG_PATH` | optional | Defaults to probing `/usr/bin/ffmpeg` (installed by the image); set only if the binary lives elsewhere. |
| `MEDIA_ROOT` | optional | Canonical media/HLS directory, defaults to `server/media` (ephemeral container FS — see §1.6). |
| `ALLOWED_ORIGINS` | recommended | Comma-separated CORS allowlist, e.g. the Vercel web domain. |
| `PAYSTACK_SECRET_KEY`, `CLOUDINARY_*` | feature-dependent | Existing secrets — set in Railway only, never committed. |

Never log or commit: `MONGO_URI`, `JWT_SECRET`, Paystack/Cloudinary keys,
stream keys. Stream keys are already redacted in logs (`redactKey` → last 4
chars only) and are owner-only via authenticated endpoints.


### 1.3 RTMP TCP proxy configuration

- The container listens on `0.0.0.0:1935` (`bind: process.env.MEDIA_BIND || "0.0.0.0"`
  in `server/src/streaming/mediaServer.js`).
- Railway cannot expose raw TCP through an HTTP domain: create a **TCP proxy**
  for port `1935` on the service (Railway feature; availability/plan-dependent)
  and copy the printed host/port into `RTMP_PUBLIC_URL`
  (`rtmp://<proxy-host>:<proxy-port>`).
- The Android RootEncoder publisher receives this URL from
  `GET /api/live-streams/ingest/:id` (owner-only) and appends
  `/live/<streamKey>` — unchanged from Phases 30–32.
- FFmpeg pulls the published stream back over loopback
  (`rtmp://127.0.0.1:<RTMP_PORT>/live/<key>`), so ingest never depends on the
  public hostname from inside the container.
- Port mismatch checklist: proxy target port = `RTMP_PORT` = the port inside
  `RTMP_PUBLIC_URL`; `MEDIA_PORT` must not equal the Railway `PORT`.

### 1.4 Public HLS/API URLs

- Set `MEDIA_BASE_URL=https://<railway-domain>` (no port).
  `resolveHlsBaseUrl()` (Phase 33) leaves portless HTTPS URLs untouched —
  the internal `:8001` static server port is **never** appended to public
  playback URLs. The main Express app serves `/live` (m3u8 + TS with correct
  content types and CORS) on `PORT`.
- Dev/LAN behavior is unchanged: an explicit `MEDIA_BASE_URL=http://host:8000`
  still remaps to `:8001` (Phase 31.1 contract).
- Production without `MEDIA_BASE_URL` fails fast at boot (existing behavior).
- API base for clients: `https://<railway-domain>/api/...`; Socket.IO shares
  the same HTTP server/port.
- If Railway and the web app are on different origins, set
  `ALLOWED_ORIGINS=https://<vercel-domain>` so browser CORS succeeds.

### 1.5 Shutdown

- `SIGTERM`/`SIGINT` (Railway sends SIGTERM on redeploy/restart) trigger:
  `hlsPackager.stopAll()` (SIGTERM→SIGKILL each FFmpeg, from
  `mediaServer.js`), HLS static server close, HTTP server close, then
  MongoDB close with a 10s force-exit guard (`index.js`). Stale live streams
  are reconciled (`isLive=false`) on next boot, so application state is never
  left mid-flight.

### 1.6 Known Railway limitations / costs

- **Ephemeral disk**: HLS segments and recordings live in the container
  filesystem and vanish on redeploy/restart — fine for live playback, but
  recorded videos must be uploaded to Cloudinary (existing
  `uploadRecordedVideo` path) before the container is replaced. Persistent
  media needs a Railway volume mounted at `MEDIA_ROOT`.
- **CPU**: each live stream runs one `libx264 veryfast 720p30` FFmpeg

---

## 2. Vercel (web)

### 2.1 Build settings

| Setting | Value |
| --- | --- |
| Root Directory | `mobile` |
| Framework Preset | Other / Expo (no auto-detected preset required) |
| Build Command | `npx expo export --platform web` (also `npm run build:web`) |
| Output Directory | `dist` |
| Install Command | `npm install` (runs in `mobile/`) |

Build-time environment variables (inlined into the JS bundle by Expo — set
them in Vercel project settings, they are **not** read at runtime):

- `EXPO_PUBLIC_API_URL` = `https://<railway-domain>/api`
- `EXPO_PUBLIC_SOCKET_URL` = `https://<railway-domain>`

(`mobile/src/config.ts` falls back to `https://api.obi-uto.com/...` in
production builds when these are unset — replace with the real Railway
domain at deploy time. Development fallbacks are dev-only and are not part
of production builds.)

### 2.2 Web compatibility findings (from code + export, not assumptions)

- **Publishing is Android-only by design**: live broadcasting uses
  `expo-live-stream` (RootEncoder), a native Android module. A browser can
  never publish RTMP with the current stack — the web surface is
  viewer-only.
- **HLS playback in browsers**: the viewer (`PlayerScreen`) uses
  `expo-video`, whose web build assigns the URL straight to a native
  `<video>` element (`video.setAttribute('src', uri)` — no hls.js anywhere
  in the dependency tree). Measured with
  `node validation/phase33/browser-hls-check.js` (real ffmpeg fixture served
  through the production `/live` route config, loaded in headless Edge):
  - playlist fetched cross-origin → 200, `application/vnd.apple.mpegurl`,
    `#EXTINF` present; segment → 200, `video/mp2t`, 68,808 bytes;
  - native `<video>` **decoded the m3u8 → `playing`, 640×360** in Edge
    (Chromium Edge ships native HLS support);
  - **Google Chrome / Firefox cannot play HLS natively** — the same
    `video.src = *.m3u8` approach fails there without an MSE-based player
    such as hls.js. Do not claim Chrome/Firefox live playback until hls.js
    (or an equivalent) is integrated; verify any target browser yourself
    with this script. Safari/iOS plays natively.
  - The exported app itself boots and renders in headless Chromium
    (login/home UI visible) — bundle compatibility ≠ full feature parity.
- The full app export completes (all Expo Router routes prerender to HTML,
  including `/content-stats/[id]` and `/edit-content/[id]`), but
  native-oriented screens (camera publishing, downloads/FileSystem,
  notifications) are degraded or no-ops on web. If a production web viewer
  is required, prefer a small dedicated viewer route (live list + player
  with hls.js) over promising full mobile parity on Vercel.
- Vercel hosts static files only: API + Socket.IO stay on Railway. Vercel's
  bandwidth/limits apply to the exported bundle; HLS traffic is served from
  Railway (not a CDN).

---

## 3. What was deliberately not done

- No deployment, no Railway/Vercel projects created, no credentials or
  `.env` committed (`.env` is git-ignored and excluded by
  `server/.dockerignore`).
- Streaming architecture (RootEncoder → RTMP → NodeMediaServer → FFmpeg HLS
  → chat) unchanged; Android publishing behavior untouched.
- Unrelated uncommitted workspace files were preserved as-is.

  process; plan vCPU/instance sizing accordingly (usage-based billing).
- **TCP proxy**: RTMP ingress requires Railway's TCP-proxy feature
  (plan-dependent); the HTTP/HTTPS domain alone cannot carry RTMP.
- **Single instance**: stream packagers and Socket.IO state are
  per-instance — scale-out would need shared storage and a sticky/pub-sub
  layer (out of scope; do not scale to multiple replicas).
- Internal ports `8000`/`8001` are reachable only inside the container.

### 1.7 Confirmed deployment blockers found and fixed (no redesign)

1. **Image runtime**: `node:18` (EOL) without FFmpeg → `node:22-bookworm-slim`
   + `apt-get install ffmpeg`, `npm ci --omit=dev`, `ENV NODE_ENV=production`.
   Without FFmpeg in the image, RTMP ingest would accept broadcasts but no
   HLS could ever be produced.
2. **Public HLS URL got an internal port**: `mediaServer.js hlsBaseUrl()`
   appended `:8001` to a *portless* `MEDIA_BASE_URL`, producing
   `https://<railway-domain>:8001/live/...` — unreachable from outside the
   container. Now `streamConfig.resolveHlsBaseUrl()` remaps only an explicit
   dev/LAN media port (`:8000`→`:8001`) and leaves public HTTPS URLs
   untouched (the main Express app serves `/live` on `PORT`).
3. **RTMP URL defaults in production**: `resolveRtmpUrl()` fell back to
   `rtmp://localhost:1935` (or guessed from the HTTPS media host) when
   `RTMP_PUBLIC_URL` was unset. Production now yields an empty URL plus an
   actionable warning until `RTMP_PUBLIC_URL` (or `PUBLIC_HOST`) is set —
   no localhost/LAN/HTTPS-host guess is ever shipped to creators.
4. **RTMP bind interface**: NMS now explicitly binds
   `process.env.MEDIA_BIND || "0.0.0.0"` so the TCP proxy can reach port
   1935 (previously implicit).
5. **Self-referential HLS playlist (playback-critical)**: the packager passed
   `-master_pl_name index.m3u8` while writing its media playlist to the very
   same `index.m3u8`. With real ffmpeg (8.1.1) the file is a master playlist
   that references *itself* — measured in 29 of 30 polls during a live
   encode — so it never keeps `#EXTINF`, `isPlaybackReady()` can never pass,
   and players cannot start. The flag was removed (a single-variant stream
   needs no master playlist); verified with the packager's exact argv that
   `index.m3u8` now stays a plain media playlist with `#EXTINF` + `.ts`
   segments, and a real browser played it (see §2.2).
