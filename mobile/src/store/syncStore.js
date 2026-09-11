import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SYNC_QUEUE_KEY = "@sync_queue";
const MAX_RETRY_ATTEMPTS = 5;

// Load persisted queue from AsyncStorage
const loadPersistedQueue = async () => {
  try {
    const data = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (err) {
    console.log("Failed to load sync queue:", err);
  }
  return [];
};

// Save queue to AsyncStorage
const persistQueue = async (queue) => {
  try {
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.log("Failed to persist sync queue:", err);
  }
};

export const useSyncStore =
  create((set, get) => ({
    queue: [],
    isProcessing: false,
    isLoaded: false,

    // Load queue from storage on init
    loadQueue: async () => {
      const queue = await loadPersistedQueue();
      set({ queue, isLoaded: true });
    },

    // Add a serializable task to the queue
    addTask: (task) => {
      // Ensure task is serializable (no functions)
      const serializableTask = {
        id: task.id,
        type: task.type,
        payload: task.payload,
        attempts: 0,
        createdAt: Date.now(),
        nextRetryAt: Date.now(),
      };

      set((state) => {
        const newQueue = [...state.queue, serializableTask];
        persistQueue(newQueue);
        return { queue: newQueue };
      });
    },

    // Update a task (e.g., increment attempts, set next retry time)
    updateTask: (id, updates) => {
      set((state) => {
        const newQueue = state.queue.map((task) =>
          task.id === id ? { ...task, ...updates } : task
        );
        persistQueue(newQueue);
        return { queue: newQueue };
      });
    },

    // Remove a task from the queue
    removeTask: (id) => {
      set((state) => {
        const newQueue = state.queue.filter(
          (task) => task.id !== id
        );
        persistQueue(newQueue);
        return { queue: newQueue };
      });
    },

    // Mark task as failed permanently
    failTask: (id) => {
      set((state) => {
        const newQueue = state.queue.map((task) =>
          task.id === id
            ? { ...task, failed: true, failedAt: Date.now() }
            : task
        );
        persistQueue(newQueue);
        return { queue: newQueue };
      });
    },

    // Clear all tasks
    clearQueue: () => {
      set({ queue: [] });
      persistQueue([]);
    },

    // Clear only failed tasks
    clearFailedTasks: () => {
      set((state) => {
        const newQueue = state.queue.filter((task) => !task.failed);
        persistQueue(newQueue);
        return { queue: newQueue };
      });
    },

    // Set processing state
    setProcessing: (isProcessing) => {
      set({ isProcessing });
    },

    // Check if task has exceeded max retry attempts
    shouldRetry: (task) => {
      return task.attempts < MAX_RETRY_ATTEMPTS;
    },

    // Calculate next retry time with exponential backoff
    getNextRetryDelay: (attempts) => {
      // Exponential backoff: 2s, 4s, 8s, 16s, 32s
      return Math.pow(2, attempts + 1) * 1000;
    },
  }));