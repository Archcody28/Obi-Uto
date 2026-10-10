import client
  from "./client";

/*
 * Phase 30 — live streaming API (mobile-first, RTMP ingest stays backend-only).
 * Technology: expo-nodemediaclient (NodePublisher) publishes the device
 * camera straight to the existing NodeMediaServer ingest; the creator never
 * sees a stream key. Requires a custom dev build (native module, no Expo Go).
 * Stream keys are returned ONLY by /mine and /ingest/:id, which require an
 * authenticated creator token. Public endpoints never expose keys.
 */

export const getLiveStreams =
  async () => {
    const res =
      await client.get(
        "/live-streams/live"
      );

    return res.data;
  };

export const createStream =
  async (data) => {
    const res =
      await client.post(
        "/live-streams",
        data
      );

    return res.data;
  };

export const getDiscovery =
  async () => {
    const res =
      await client.get(
        "/live-streams/discover"
      );

    return res;
  };

/* Public stream view for the player (no stream key). */
export const getStream =
  async (streamId) => {
    const res = await client.get(
      `/live-streams/${streamId}`
    );

    return res.data;
  };

/* Creator's own streams (includes streamKey + ingest setup). */
export const getMyStreams =
  async () => {
    const res =
      await client.get(
        "/live-streams/mine"
      );

    return res.data;
  };

/* Owner-only RTMP server URL + stream key for one stream. */
export const getStreamIngest =
  async (streamId) => {
    const res =
      await client.get(
        `/live-streams/ingest/${streamId}`
      );

    return res.data;
  };

/*
 * Phase 30 — mobile publisher handshake. Records preview/publishing/
 * heartbeat/stopped without ever marking the stream live (only real RTMP
 * ingest via postPublish may set isLive=true).
 */
export const sendMobileSignal =
  async (streamId, action) => {
    const res =
      await client.post(
        `/live-streams/mobile-signal/${streamId}`,
        { action }
      );

    return res.data;
  };

/* Owner-only live confirmation poll (live only after ingest connects). */
export const getOwnerStatus =
  async (streamId) => {
    const res =
      await client.get(
        `/live-streams/status/${streamId}`
      );

    return res.data;
  };

export const updateStream =
  async (streamId, data) => {
    const res =
      await client.patch(
        `/live-streams/${streamId}`,
        data
      );

    return res.data;
  };

/* Opens a scheduled stream (broadcast starts via RTMP ingest). */
export const startOwnStream =
  async (streamId) => {
    const res =
      await client.put(
        `/live-streams/start/${streamId}`
      );

    return res.data;
  };

/* Ends a stream. Requires creator ownership. */
export const endOwnStream =
  async (streamId) => {
    const res =
      await client.put(
        `/live-streams/end/${streamId}`
      );

    return res.data;
  };
