# Phase 33 — Railway-ready image.
# Supported Node LTS runtime + FFmpeg for the RTMP-to-HLS packager
# (server/src/streaming/hlsPackager.js spawns ffmpeg on stream publish).
FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production

# The HTTP API binds to the platform-provided PORT (Railway injects $PORT and
# injects traffic only to that port). RTMP ingest listens on
# 0.0.0.0:RTMP_PORT (default 1935) and is exposed via a Railway TCP proxy.
EXPOSE 1935

CMD ["node", "src/index.js"]