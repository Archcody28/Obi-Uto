import NetInfo from "@react-native-community/netinfo";
import {
  useSyncStore,
} from "../store/syncStore";
import { api } from "../api/client";

// Map task types to known API operations
const taskExecutors = {
  // Save watch progress
  "save-progress": async (payload) => {
    return api.post("/watch/progress", payload);
  },
  // Add favorite
  "add-favorite": async (payload) => {
    return api.post("/favorites", payload);
  },
  // Save rating/review
  "save-review": async (payload) => {
    return api.post("/engagement/review", payload);
  },
  // Follow user
  "follow-user": async (payload) => {
    return api.post("/follows/follow", payload);
  },
};

// Execute a single task by type
const executeTask = async (task) => {
  const executor = taskExecutors[task.type];

  if (!executor) {
    throw new Error(`Unknown task type: ${task.type}`);
  }

  return executor(task.payload);
};

// Process all tasks in the queue
const processQueue = async () => {
  const store = useSyncStore.getState();

  // Prevent concurrent processing
  if (store.isProcessing) {
    return;
  }

  store.setProcessing(true);

  try {
    const { queue, removeTask, updateTask, failTask, shouldRetry, getNextRetryDelay } = useSyncStore.getState();

    for (const task of queue) {
      // Skip failed tasks
      if (task.failed) continue;

      // Skip tasks that aren't ready for retry
      if (Date.now() < task.nextRetryAt) continue;

      try {
        await executeTask(task);
        // Success: remove from queue
        removeTask(task.id);
      } catch (err) {
        console.log(`Sync task ${task.id} failed (attempt ${task.attempts + 1}):`, err.message);

        const newAttempts = (task.attempts || 0) + 1;

        if (!shouldRetry({ ...task, attempts: newAttempts })) {
          // Max retries exceeded: mark as failed
          failTask(task.id);
        } else {
          // Update task with new attempt count and next retry time
          const delay = getNextRetryDelay(newAttempts);
          updateTask(task.id, {
            attempts: newAttempts,
            nextRetryAt: Date.now() + delay,
          });
        }
      }
    }
  } finally {
    useSyncStore.getState().setProcessing(false);
  }
};

// NetInfo listener reference for cleanup
let netInfoUnsubscribe = null;

export function startSyncEngine() {
  const store = useSyncStore.getState();

  // Load persisted queue on start
  if (!store.isLoaded) {
    store.loadQueue();
  }

  // Clean up any existing listener before adding a new one
  if (netInfoUnsubscribe) {
    netInfoUnsubscribe();
  }

  // Register network listener (only one)
  netInfoUnsubscribe = NetInfo.addEventListener(
    async (state) => {
      if (!state.isConnected) {
        return;
      }

      // Process queue when online
      await processQueue();
    }
  );

  // Also process queue immediately in case we're already online
  NetInfo.fetch().then((state) => {
    if (state.isConnected) {
      processQueue();
    }
  });
}

// Clean up function for hot-reload or app shutdown
export function stopSyncEngine() {
  if (netInfoUnsubscribe) {
    netInfoUnsubscribe();
    netInfoUnsubscribe = null;
  }
}