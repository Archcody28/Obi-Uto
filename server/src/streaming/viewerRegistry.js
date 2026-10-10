"use strict";
/*
 * Phase 29 — accurate live viewer accounting.
 *
 * Tracks one Set of socket ids per stream so that:
 *  - joining is idempotent per socket (double join-stream does not inflate),
 *  - leaving only decrements when the socket actually was a viewer,
 *  - disconnects always release every room the socket was in,
 *  - counts can never go negative.
 */
class ViewerRegistry {
  constructor() {
    // streamId -> Set<socketId>
    this.rooms = new Map();
  }

  join(streamId, socketId) {
    if (!streamId || !socketId) {
      return { count: this.get(streamId), changed: false };
    }

    let set = this.rooms.get(streamId);
    if (!set) {
      set = new Set();
      this.rooms.set(streamId, set);
    }

    const changed = !set.has(socketId);
    set.add(socketId);

    return { count: set.size, changed };
  }

  leave(streamId, socketId) {
    if (!streamId || !socketId) {
      return { count: this.get(streamId), changed: false };
    }

    const set = this.rooms.get(streamId);
    if (!set || !set.has(socketId)) {
      return { count: this.get(streamId), changed: false };
    }

    set.delete(socketId);
    const count = set.size;

    if (count <= 0) this.rooms.delete(streamId);

    return { count: Math.max(0, count), changed: true };
  }

  /* Remove a socket from every room. Returns affected [streamId, count]. */
  disconnect(socketId) {
    const affected = [];
    if (!socketId) return affected;

    for (const [streamId, set] of Array.from(this.rooms.entries())) {
      if (!set.delete(socketId)) continue;

      const count = Math.max(0, set.size);
      if (count <= 0) this.rooms.delete(streamId);

      affected.push([streamId, count]);
    }

    return affected;
  }

  get(streamId) {
    const set = this.rooms.get(streamId);
    return set ? Math.max(0, set.size) : 0;
  }

  /* Force-reset a room (e.g. when the stream ends server-side). */
  reset(streamId) {
    this.rooms.delete(streamId);
    return 0;
  }
}

module.exports = { ViewerRegistry };
